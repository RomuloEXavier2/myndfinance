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

    const { itemId } = await req.json();
    if (!itemId) {
      return new Response(JSON.stringify({ error: "itemId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch item details
    const itemResponse = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    if (!itemResponse.ok) {
      throw new Error("Failed to fetch item details");
    }

    const item = await itemResponse.json();
    const bankName = item.connector?.name || "Unknown Bank";

    console.log(`Syncing data for item ${itemId} from ${bankName}`);

    // 1. Fetch and sync ACCOUNTS
    const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    let accountsCount = 0;
    let totalBalance = 0;

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      for (const account of accountsData.results || []) {
        const { error: upsertError } = await supabaseAdmin
          .from("bank_accounts")
          .upsert({
            user_id: user.id,
            pluggy_item_id: itemId,
            pluggy_account_id: account.id,
            bank_name: bankName,
            account_type: account.type || "CHECKING",
            balance: account.balance || 0,
            currency: account.currencyCode || "BRL",
            last_sync_at: new Date().toISOString(),
          }, { onConflict: "pluggy_account_id" });

        if (!upsertError) {
          accountsCount++;
          totalBalance += account.balance || 0;
        }

        // Sync transactions for each account
        await syncTransactions(supabaseAdmin, apiKey, account.id, user.id);
      }
    }

    // 2. Fetch and sync CREDIT CARDS
    const creditCardsResponse = await fetch(`https://api.pluggy.ai/credit-cards?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    let creditCardsCount = 0;
    let totalCreditLimit = 0;
    let totalCreditAvailable = 0;

    if (creditCardsResponse.ok) {
      const creditCardsData = await creditCardsResponse.json();
      for (const card of creditCardsData.results || []) {
        const { error: upsertError } = await supabaseAdmin
          .from("credit_cards")
          .upsert({
            user_id: user.id,
            pluggy_card_id: card.id,
            bank_name: bankName,
            card_name: card.name || card.brand || "Cartão de Crédito",
            limit_total: card.creditLimit || 0,
            limit_available: card.availableCreditLimit || 0,
            current_bill: card.balanceCloseDate || 0,
            due_date: card.balanceDueDate ? new Date(card.balanceDueDate).toISOString().split('T')[0] : null,
            closing_date: card.balanceCloseDate ? new Date(card.balanceCloseDate).toISOString().split('T')[0] : null,
          }, { onConflict: "pluggy_card_id" });

        if (!upsertError) {
          creditCardsCount++;
          totalCreditLimit += card.creditLimit || 0;
          totalCreditAvailable += card.availableCreditLimit || 0;
        }
      }
    }

    // 3. Fetch and sync LOANS
    const loansResponse = await fetch(`https://api.pluggy.ai/loans?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    let loansCount = 0;
    let totalLoansAmount = 0;

    if (loansResponse.ok) {
      const loansData = await loansResponse.json();
      for (const loan of loansData.results || []) {
        const { error: upsertError } = await supabaseAdmin
          .from("loans")
          .upsert({
            user_id: user.id,
            pluggy_loan_id: loan.id,
            bank_name: bankName,
            loan_type: loan.type || loan.contractType || "Personal",
            amount_available: loan.contractedAmount || 0,
            amount_taken: loan.principalAmount || loan.contractedAmount || 0,
            interest_rate: loan.interestRate || 0,
            monthly_payment: loan.installmentAmount || 0,
            due_date: loan.dueDate ? new Date(loan.dueDate).toISOString().split('T')[0] : null,
          }, { onConflict: "pluggy_loan_id" });

        if (!upsertError) {
          loansCount++;
          totalLoansAmount += loan.principalAmount || loan.contractedAmount || 0;
        }
      }
    }

    // 4. Fetch and sync INVESTMENTS
    const investmentsResponse = await fetch(`https://api.pluggy.ai/investments?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    let investmentsCount = 0;
    let totalInvestments = 0;

    if (investmentsResponse.ok) {
      const investmentsData = await investmentsResponse.json();
      for (const investment of investmentsData.results || []) {
        const { error: upsertError } = await supabaseAdmin
          .from("investments")
          .upsert({
            user_id: user.id,
            pluggy_investment_id: investment.id,
            bank_name: bankName,
            investment_type: investment.type || investment.subtype || "Other",
            name: investment.name || "Investimento",
            total_saved: investment.balance || investment.value || 0,
            currency: investment.currencyCode || "BRL",
            annual_rate: investment.annualRate || 0,
          }, { onConflict: "pluggy_investment_id" });

        if (!upsertError) {
          investmentsCount++;
          totalInvestments += investment.balance || investment.value || 0;
        }
      }
    }

    const summary = {
      success: true,
      bankName,
      synced: {
        accounts: accountsCount,
        creditCards: creditCardsCount,
        loans: loansCount,
        investments: investmentsCount,
      },
      totals: {
        balance: totalBalance,
        creditLimit: totalCreditLimit,
        creditAvailable: totalCreditAvailable,
        loans: totalLoansAmount,
        investments: totalInvestments,
      },
    };

    console.log("Sync completed:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncTransactions(supabase: any, apiKey: string, accountId: string, userId: string) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);

  const transactionsResponse = await fetch(
    `https://api.pluggy.ai/transactions?accountId=${accountId}&from=${fromDate.toISOString().split('T')[0]}`,
    { headers: { "X-API-KEY": apiKey } }
  );

  if (!transactionsResponse.ok) {
    console.error("Failed to fetch transactions for account:", accountId);
    return;
  }

  const transactionsData = await transactionsResponse.json();

  for (const tx of transactionsData.results || []) {
    const tipo = tx.amount > 0 ? "RECEITA" : "DESPESA";
    const valor = Math.abs(tx.amount);
    const item = tx.description || tx.descriptionRaw || "Transação bancária";
    const categoria = mapCategory(tx.category || "");

    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("item", item)
      .eq("valor", valor)
      .eq("created_at", tx.date)
      .maybeSingle();

    if (!existing) {
      await supabase.from("transactions").insert({
        user_id: userId,
        tipo,
        valor,
        item,
        categoria,
        forma_pagamento: "Banco",
        created_at: tx.date,
      });
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
