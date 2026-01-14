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
    const payload = await req.json();
    console.log("Pluggy webhook received:", JSON.stringify(payload));

    const { event, itemId, data } = payload;

    // Use service role to bypass RLS for webhook operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle different webhook events
    if (event === "item/created" || event === "item/updated") {
      await handleItemUpdate(supabaseAdmin, itemId, data);
    } else if (event === "connector/status_updated") {
      console.log("Connector status updated:", data);
    } else if (event === "item/deleted") {
      await handleItemDeleted(supabaseAdmin, itemId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleItemUpdate(supabase: any, itemId: string, data: any) {
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Pluggy credentials not configured");
  }

  // Get API Key
  const authResponse = await fetch("https://api.pluggy.ai/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!authResponse.ok) {
    throw new Error("Failed to authenticate with Pluggy");
  }

  const { apiKey } = await authResponse.json();

  // Get item details to find the user
  const itemResponse = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });

  if (!itemResponse.ok) {
    throw new Error("Failed to fetch item details");
  }

  const item = await itemResponse.json();
  const userId = item.clientUserId;

  if (!userId) {
    console.log("No clientUserId found for item, skipping");
    return;
  }

  // Get accounts for this item
  const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });

  if (!accountsResponse.ok) {
    throw new Error("Failed to fetch accounts");
  }

  const accountsData = await accountsResponse.json();

  // Save/update bank accounts
  for (const account of accountsData.results || []) {
    const { error: upsertError } = await supabase
      .from("bank_accounts")
      .upsert({
        user_id: userId,
        pluggy_item_id: itemId,
        pluggy_account_id: account.id,
        bank_name: item.connector?.name || "Unknown Bank",
        account_type: account.type || "CHECKING",
        balance: account.balance || 0,
        currency: account.currencyCode || "BRL",
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: "pluggy_account_id",
      });

    if (upsertError) {
      console.error("Error upserting bank account:", upsertError);
    }

    // Fetch and sync transactions for this account
    await syncTransactions(supabase, apiKey, account.id, userId);
  }
}

async function syncTransactions(supabase: any, apiKey: string, accountId: string, userId: string) {
  // Get transactions for the last 90 days
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);

  const transactionsResponse = await fetch(
    `https://api.pluggy.ai/transactions?accountId=${accountId}&from=${fromDate.toISOString().split('T')[0]}`,
    { headers: { "X-API-KEY": apiKey } }
  );

  if (!transactionsResponse.ok) {
    console.error("Failed to fetch transactions");
    return;
  }

  const transactionsData = await transactionsResponse.json();

  for (const tx of transactionsData.results || []) {
    // Map Pluggy transaction to our schema
    const tipo = tx.amount > 0 ? "RECEITA" : "DESPESA";
    const valor = Math.abs(tx.amount);
    const item = tx.description || tx.descriptionRaw || "Transação bancária";
    const categoria = mapCategory(tx.category || "");

    // Check if transaction already exists (avoid duplicates)
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("item", item)
      .eq("valor", valor)
      .eq("created_at", tx.date)
      .single();

    if (!existing) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          tipo,
          valor,
          item,
          categoria,
          forma_pagamento: "Banco",
          created_at: tx.date,
        });

      if (insertError) {
        console.error("Error inserting transaction:", insertError);
      } else {
        console.log(`Inserted transaction: ${item} - R$ ${valor}`);
      }
    }
  }
}

function mapCategory(pluggyCategory: string): string {
  const categoryMap: Record<string, string> = {
    "FOOD": "Alimentação",
    "TRANSPORT": "Transporte",
    "HOUSING": "Moradia",
    "UTILITIES": "Utilidades",
    "HEALTH": "Saúde",
    "EDUCATION": "Educação",
    "ENTERTAINMENT": "Lazer",
    "SHOPPING": "Compras",
    "TRAVEL": "Viagem",
    "TRANSFERS": "Transferências",
    "SALARY": "Salário",
    "INVESTMENTS": "Investimentos",
    "OTHER_INCOME": "Outras Receitas",
    "OTHER_EXPENSE": "Outras Despesas",
  };

  return categoryMap[pluggyCategory] || "Geral";
}

async function handleItemDeleted(supabase: any, itemId: string) {
  // Remove bank accounts associated with this item
  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("pluggy_item_id", itemId);

  if (error) {
    console.error("Error deleting bank accounts:", error);
  }
}
