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

    // Handle explicit DELETE_LAST action
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
          JSON.stringify({ success: false, message: "Nenhuma transação para deletar" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("transactions").delete().eq("id", lastTransaction.id);

      return new Response(
        JSON.stringify({ success: true, message: "Última transação deletada", action: "DELETE_LAST" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: "Dados de áudio são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Step 1: Transcribe audio using Gemini
    const transcriptionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Transcreva este áudio em português brasileiro. Retorne APENAS a transcrição literal, sem formatação ou explicações." 
            },
            { 
              type: "input_audio", 
              input_audio: { data: audioBase64, format: "webm" } 
            }
          ]
        }],
      }),
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error("Transcription error:", errorText);
      throw new Error("Falha ao transcrever áudio");
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcribedText = transcriptionResult.choices?.[0]?.message?.content?.trim();

    if (!transcribedText) {
      return new Response(
        JSON.stringify({ error: "Não foi possível transcrever o áudio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Transcribed text:", transcribedText);

    // Step 2: Extract financial data with STRICT validation
    const extractionPrompt = `Você é um extrator de dados financeiros RIGOROSO. Analise o texto transcrito e extraia informações financeiras.

REGRAS ESTRITAS:
1. O texto DEVE conter um VALOR NUMÉRICO (em reais) E uma DESCRIÇÃO do item/serviço
2. Se o texto for conversa casual, poesia, música, piada, ou qualquer coisa SEM dados financeiros claros, retorne ERRO
3. Palavras-chave para identificar transações válidas:
   - RECEITA (entrada de dinheiro): "ganhei", "recebi", "salário", "vendi", "faturei", "entrou", "me pagaram"
   - DESPESA (saída de dinheiro): "gastei", "paguei", "comprei", "custou", "saiu", "perdi"
   - RESERVA (poupança/investimento): "guardei", "investi", "poupar", "reservei", "apliquei", "economizei"

FORMATO DE RESPOSTA (JSON apenas, sem markdown):

Se for transação válida:
{"item": "descrição do item/serviço", "valor": numero_sem_simbolo, "tipo": "RECEITA|DESPESA|RESERVA", "categoria": "categoria apropriada", "forma_pagamento": "método ou null"}

Se for comando de deletar (palavras como "apagar", "deletar", "remover", "cancelar" + "último/última"):
{"action": "DELETE_LAST"}

Se NÃO for dado financeiro válido:
{"error": "Papapo furado detectado. Por favor, informe um valor financeiro."}

EXEMPLOS:
- "Gastei 50 reais no almoço" → {"item": "almoço", "valor": 50, "tipo": "DESPESA", "categoria": "Alimentação", "forma_pagamento": null}
- "Recebi 3000 de salário" → {"item": "salário", "valor": 3000, "tipo": "RECEITA", "categoria": "Salário", "forma_pagamento": null}
- "Guardei 500 reais para emergência" → {"item": "reserva de emergência", "valor": 500, "tipo": "RESERVA", "categoria": "Poupança", "forma_pagamento": null}
- "Bom dia, tudo bem?" → {"error": "Papapo furado detectado. Por favor, informe um valor financeiro."}
- "A vida é bela como uma flor" → {"error": "Papapo furado detectado. Por favor, informe um valor financeiro."}
- "Apagar última transação" → {"action": "DELETE_LAST"}

TEXTO TRANSCRITO: "${transcribedText}"

Responda APENAS com o JSON, sem explicações.`;

    const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: extractionPrompt }
        ],
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error("Extraction error:", errorText);
      throw new Error("Falha ao extrair dados financeiros");
    }

    const extractionResult = await extractionResponse.json();
    const rawContent = extractionResult.choices?.[0]?.message?.content || "";
    
    console.log("Raw AI response:", rawContent);

    // Parse JSON from response (handle potential markdown code blocks)
    let financialData;
    try {
      let jsonString = rawContent.trim();
      // Remove markdown code blocks if present
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      financialData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw:", rawContent);
      return new Response(
        JSON.stringify({ 
          error: "Não entendi o que você disse. Tente novamente com um valor e descrição claros.",
          transcription: transcribedText 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parsed financial data:", financialData);

    // Check if AI returned an error (invalid financial data)
    if (financialData.error) {
      return new Response(
        JSON.stringify({ 
          error: financialData.error, 
          transcription: transcribedText 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle DELETE_LAST action from voice command
    if (financialData.action === "DELETE_LAST") {
      const { data: lastTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastTx) {
        await supabase.from("transactions").delete().eq("id", lastTx.id);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "DELETE_LAST", 
          message: "Última transação deletada",
          transcription: transcribedText 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields for a transaction
    if (!financialData.item || financialData.valor === undefined || !financialData.tipo) {
      return new Response(
        JSON.stringify({ 
          error: "Dados incompletos. Informe o que você gastou/recebeu e o valor.",
          transcription: transcribedText 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate tipo is one of the allowed values
    const validTipos = ["RECEITA", "DESPESA", "RESERVA"];
    if (!validTipos.includes(financialData.tipo)) {
      return new Response(
        JSON.stringify({ 
          error: "Tipo de transação inválido. Use: receita, despesa ou reserva.",
          transcription: transcribedText 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate valor is a positive number
    const valor = parseFloat(financialData.valor);
    if (isNaN(valor) || valor <= 0) {
      return new Response(
        JSON.stringify({ 
          error: "Valor inválido. Informe um número positivo.",
          transcription: transcribedText 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the transaction
    const { data: transaction, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        item: financialData.item,
        valor: valor,
        tipo: financialData.tipo,
        categoria: financialData.categoria || "Geral",
        forma_pagamento: financialData.forma_pagamento || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    const tipoLabel = financialData.tipo === "RECEITA" 
      ? "Receita" 
      : financialData.tipo === "DESPESA" 
        ? "Despesa" 
        : "Reserva";

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction, 
        transcription: transcribedText,
        message: `${tipoLabel} de R$ ${valor.toFixed(2)} registrada: ${financialData.item}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    console.error("Error:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    
    // Handle rate limits and payment errors
    if (message.includes("Rate limit") || message.includes("429")) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (message.includes("Payment") || message.includes("402")) {
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
