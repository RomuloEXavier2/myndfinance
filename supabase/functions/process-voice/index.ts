import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { audioBase64, action } = await req.json();

    if (action === "DELETE_LAST") {
      const { data: lastTransaction } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastTransaction) {
        return new Response(
          JSON.stringify({ success: false, message: "No transaction to delete" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("transactions").delete().eq("id", lastTransaction.id);

      return new Response(
        JSON.stringify({ success: true, message: "Last transaction deleted", action: "DELETE_LAST" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: "Audio data required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Transcribe audio
    const transcriptionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Transcribe this audio in Portuguese. Return ONLY the transcription." },
            { type: "input_audio", input_audio: { data: audioBase64, format: "webm" } }
          ]
        }],
      }),
    });

    if (!transcriptionResponse.ok) throw new Error("Failed to transcribe audio");

    const transcriptionResult = await transcriptionResponse.json();
    const transcribedText = transcriptionResult.choices?.[0]?.message?.content?.trim();

    if (!transcribedText) {
      return new Response(JSON.stringify({ error: "Could not transcribe audio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract financial data
    const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `Extract financial data from Portuguese speech. Return JSON only:
{"item": "description", "valor": number, "tipo": "RECEITA|DESPESA|RESERVA", "categoria": "category", "forma_pagamento": "method or null"}
RECEITA: ganhei, recebi, salário, vendi. DESPESA: gastei, paguei, comprei. RESERVA: guardar, poupar, investir.
For delete commands (apagar/deletar último): {"action": "DELETE_LAST"}
If invalid: {"error": "reason"}` },
          { role: "user", content: transcribedText }
        ],
      }),
    });

    if (!extractionResponse.ok) throw new Error("Failed to extract data");

    const extractionResult = await extractionResponse.json();
    let financialData;
    try {
      financialData = JSON.parse(extractionResult.choices?.[0]?.message?.content || "{}");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid AI response" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (financialData.action === "DELETE_LAST") {
      const { data: lastTx } = await supabase.from("transactions").select("id")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (lastTx) await supabase.from("transactions").delete().eq("id", lastTx.id);
      return new Response(JSON.stringify({ success: true, action: "DELETE_LAST", transcription: transcribedText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (financialData.error || !financialData.item || !financialData.valor || !financialData.tipo) {
      return new Response(JSON.stringify({ error: financialData.error || "Missing fields", transcription: transcribedText }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: transaction, error: insertError } = await supabase.from("transactions").insert({
      user_id: userId,
      item: financialData.item,
      valor: parseFloat(financialData.valor),
      tipo: financialData.tipo,
      categoria: financialData.categoria || "Geral",
      forma_pagamento: financialData.forma_pagamento || null,
    }).select().single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, transaction, transcription: transcribedText,
      message: `${financialData.tipo === 'RECEITA' ? 'Receita' : financialData.tipo === 'DESPESA' ? 'Despesa' : 'Reserva'} de R$ ${financialData.valor} registrada` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    console.error("Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Rate limit") ? 429 : message.includes("Payment") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
