import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI-powered categorization prompt
const CATEGORIZATION_PROMPT = `Você é um especialista em categorização de transações financeiras brasileiras.

Analise a descrição da transação e retorne APENAS o nome da categoria mais apropriada.

CATEGORIAS DISPONÍVEIS:
- Alimentação (restaurantes, iFood, supermercados, padarias, delivery)
- Transporte (Uber, 99, combustível, estacionamento, táxi, pedágio)
- Moradia (aluguel, condomínio, IPTU, reformas)
- Utilidades (luz, água, gás, internet, telefone)
- Saúde (farmácia, médico, dentista, exames, plano de saúde)
- Educação (escola, faculdade, cursos, livros)
- Lazer (cinema, streaming, jogos, viagens, esportes)
- Compras (roupas, eletrônicos, móveis, shopping)
- Transferências (PIX, TED, DOC)
- Salário (pagamento, remuneração, pró-labore)
- Investimentos (aplicação, resgate, dividendos)
- Assinaturas (Netflix, Spotify, Amazon Prime, clubes)
- Taxas (IOF, tarifas bancárias, anuidade)
- Outros

PADRÕES CONHECIDOS:
- IFD*IFOOD, IFOOD* → Alimentação
- UBER*, 99* → Transporte
- PAG*JOE, PICPAY* → analise o contexto
- PIX*, TED* → Transferências
- NETFLIX, SPOTIFY, AMAZON PRIME → Assinaturas
- FARMACIA*, DROGARIA* → Saúde
- POSTO*, SHELL*, IPIRANGA* → Transporte

Retorne SOMENTE o nome da categoria, sem explicações.`;

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

    // Fetch uncategorized transactions
    const { data: transactions, error: fetchError } = await supabase
      .from("transactions")
      .select("id, item")
      .eq("user_id", user.id)
      .in("categoria", ["Geral", "Outros"])
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ updated: 0, message: "Nenhuma transação para recategorizar" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use service role for updates
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let updatedCount = 0;

    // Process transactions in batches to avoid rate limits
    for (const tx of transactions) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: CATEGORIZATION_PROMPT },
              { role: "user", content: tx.item }
            ],
            max_tokens: 50,
          }),
        });

        if (!response.ok) {
          console.error(`AI error for transaction ${tx.id}`);
          continue;
        }

        const result = await response.json();
        const category = result.choices?.[0]?.message?.content?.trim();

        if (category && category !== "Geral" && category !== "Outros") {
          const { error: updateError } = await supabaseAdmin
            .from("transactions")
            .update({ categoria: category })
            .eq("id", tx.id)
            .eq("user_id", user.id);

          if (!updateError) {
            updatedCount++;
            console.log(`Categorized "${tx.item}" → ${category}`);
          }
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.error(`Error processing transaction ${tx.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ 
      updated: updatedCount, 
      total: transactions.length,
      message: `${updatedCount} transações recategorizadas`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Recategorization error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
