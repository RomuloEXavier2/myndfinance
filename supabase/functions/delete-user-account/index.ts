import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { confirmation } = await req.json();
    if (confirmation !== "DELETE_MY_ACCOUNT") {
      return new Response(JSON.stringify({ error: "Invalid confirmation code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
    const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");

    // Use service role for all deletions
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all bank accounts to disconnect from Pluggy
    const { data: bankAccounts } = await supabaseAdmin
      .from("bank_accounts")
      .select("pluggy_item_id")
      .eq("user_id", user.id);

    // Disconnect from Pluggy if credentials are available
    if (clientId && clientSecret && bankAccounts?.length) {
      try {
        const authResponse = await fetch("https://api.pluggy.ai/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, clientSecret }),
        });

        if (authResponse.ok) {
          const { apiKey } = await authResponse.json();
          const uniqueItemIds = [...new Set(bankAccounts.map(a => a.pluggy_item_id))];

          for (const itemId of uniqueItemIds) {
            await fetch(`https://api.pluggy.ai/items/${itemId}`, {
              method: "DELETE",
              headers: { "X-API-KEY": apiKey },
            });
          }
        }
      } catch (e) {
        console.error("Error disconnecting from Pluggy:", e);
      }
    }

    console.log(`Deleting all data for user ${user.id}`);

    // Delete all user data in order (respecting any potential FK constraints)
    await supabaseAdmin.from("transactions").delete().eq("user_id", user.id);
    await supabaseAdmin.from("bank_accounts").delete().eq("user_id", user.id);
    await supabaseAdmin.from("credit_cards").delete().eq("user_id", user.id);
    await supabaseAdmin.from("loans").delete().eq("user_id", user.id);
    await supabaseAdmin.from("investments").delete().eq("user_id", user.id);

    // Finally, delete the user from auth.users
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error("Error deleting user:", deleteUserError);
      throw new Error("Failed to delete user account");
    }

    console.log(`Successfully deleted user ${user.id} and all associated data`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Delete account error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
