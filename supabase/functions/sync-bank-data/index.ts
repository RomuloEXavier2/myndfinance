import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to log both to console and database
async function logDebug(
  supabaseAdmin: any,
  userId: string,
  stage: string,
  message: string,
  details?: any,
  level: string = "info"
) {
  console.log(`[${stage}] ${message}`, details ? JSON.stringify(details) : "");
  
  try {
    await supabaseAdmin.from("debug_logs").insert({
      user_id: userId,
      function_name: "sync-bank-data",
      stage,
      message,
      details: details || null,
      level,
    });
  } catch (e) {
    console.error("Failed to save debug log:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create admin client early for error logging
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let userId = "unknown";

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    console.log("[AUTH] Iniciando autenticação do usuário");

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      await logDebug(supabaseAdmin, "unknown", "AUTH_ERROR", "Falha na autenticação", { error: authError?.message }, "error");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = user.id;
    await logDebug(supabaseAdmin, userId, "AUTH_SUCCESS", "Usuário autenticado com sucesso");

    const { itemId } = await req.json();
    if (!itemId) {
      await logDebug(supabaseAdmin, userId, "VALIDATION_ERROR", "itemId não fornecido", null, "error");
      return new Response(JSON.stringify({ error: "itemId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logDebug(supabaseAdmin, userId, "SYNC_START", "Iniciando sincronização", { itemId });

    const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
    const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      await logDebug(supabaseAdmin, userId, "CONFIG_ERROR", "Credenciais Pluggy não configuradas", null, "error");
      throw new Error("Pluggy credentials not configured");
    }

    // Get API Key
    await logDebug(supabaseAdmin, userId, "PLUGGY_AUTH", "Iniciando autenticação com Pluggy API");
    
    const authResponse = await fetch("https://api.pluggy.ai/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    if (!authResponse.ok) {
      const authErrorBody = await authResponse.text();
      await logDebug(supabaseAdmin, userId, "PLUGGY_AUTH_ERROR", `Falha na autenticação Pluggy: ${authResponse.status}`, { 
        status: authResponse.status, 
        body: authErrorBody 
      }, "error");
      throw new Error(`Failed to authenticate with Pluggy: ${authResponse.status}`);
    }

    const { apiKey } = await authResponse.json();
    await logDebug(supabaseAdmin, userId, "PLUGGY_AUTH_SUCCESS", "Autenticação Pluggy bem-sucedida");

    // Fetch item details
    await logDebug(supabaseAdmin, userId, "FETCH_ITEM", "Buscando detalhes do item", { itemId });
    
    const itemResponse = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    if (!itemResponse.ok) {
      const itemErrorBody = await itemResponse.text();
      await logDebug(supabaseAdmin, userId, "FETCH_ITEM_ERROR", `Falha ao buscar item: ${itemResponse.status}`, { 
        status: itemResponse.status, 
        body: itemErrorBody,
        itemId 
      }, "error");
      throw new Error(`Failed to fetch item details: ${itemResponse.status}`);
    }

    const item = await itemResponse.json();
    const bankName = item.connector?.name || "Unknown Bank";
    await logDebug(supabaseAdmin, userId, "FETCH_ITEM_SUCCESS", `Item encontrado: ${bankName}`, { 
      itemId, 
      bankName,
      connectorId: item.connector?.id 
    });

    // 1. Fetch and sync ACCOUNTS
    await logDebug(supabaseAdmin, userId, "FETCH_ACCOUNTS", "Iniciando fetch de contas");
    
    const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    let accountsCount = 0;
    let totalBalance = 0;

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      await logDebug(supabaseAdmin, userId, "ACCOUNTS_RESPONSE", `Resposta da Pluggy: ${accountsResponse.status}`, {
        totalAccounts: accountsData.results?.length || 0,
        preview: accountsData.results?.slice(0, 2)
      });

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

        if (upsertError) {
          await logDebug(supabaseAdmin, userId, "ACCOUNT_UPSERT_ERROR", `Erro ao salvar conta: ${account.id}`, { error: upsertError.message }, "error");
        } else {
          accountsCount++;
          totalBalance += account.balance || 0;
        }

        // Sync transactions for each account
        await syncTransactions(supabaseAdmin, apiKey, account.id, user.id, userId);
      }
    } else {
      const accountsErrorBody = await accountsResponse.text();
      await logDebug(supabaseAdmin, userId, "ACCOUNTS_ERROR", `Erro ao buscar contas: ${accountsResponse.status}`, {
        status: accountsResponse.status,
        body: accountsErrorBody
      }, "error");
    }

    await logDebug(supabaseAdmin, userId, "ACCOUNTS_SYNC_DONE", `Contas sincronizadas: ${accountsCount}`, { totalBalance });

    // 2. Fetch and sync CREDIT CARDS
    await logDebug(supabaseAdmin, userId, "FETCH_CREDIT_CARDS", "Iniciando fetch de cartões de crédito");
    
    const creditCardsResponse = await fetch(`https://api.pluggy.ai/credit-cards?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    let creditCardsCount = 0;
    let totalCreditLimit = 0;
    let totalCreditAvailable = 0;

    if (creditCardsResponse.ok) {
      const creditCardsData = await creditCardsResponse.json();
      await logDebug(supabaseAdmin, userId, "CREDIT_CARDS_RESPONSE", `Resposta da Pluggy: ${creditCardsResponse.status}`, {
        totalCards: creditCardsData.results?.length || 0,
        preview: creditCardsData.results?.slice(0, 2)
      });

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

        if (upsertError) {
          await logDebug(supabaseAdmin, userId, "CREDIT_CARD_UPSERT_ERROR", `Erro ao salvar cartão: ${card.id}`, { error: upsertError.message }, "error");
        } else {
          creditCardsCount++;
          totalCreditLimit += card.creditLimit || 0;
          totalCreditAvailable += card.availableCreditLimit || 0;
        }
      }
    } else {
      const cardsErrorBody = await creditCardsResponse.text();
      await logDebug(supabaseAdmin, userId, "CREDIT_CARDS_ERROR", `Erro ao buscar cartões: ${creditCardsResponse.status}`, {
        status: creditCardsResponse.status,
        body: cardsErrorBody
      }, "error");
    }

    await logDebug(supabaseAdmin, userId, "CREDIT_CARDS_SYNC_DONE", `Cartões sincronizados: ${creditCardsCount}`, { totalCreditLimit, totalCreditAvailable });

    // 3. Fetch and sync LOANS
    await logDebug(supabaseAdmin, userId, "FETCH_LOANS", "Iniciando fetch de empréstimos");
    
    const loansResponse = await fetch(`https://api.pluggy.ai/loans?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    let loansCount = 0;
    let totalLoansAmount = 0;

    if (loansResponse.ok) {
      const loansData = await loansResponse.json();
      await logDebug(supabaseAdmin, userId, "LOANS_RESPONSE", `Resposta da Pluggy: ${loansResponse.status}`, {
        totalLoans: loansData.results?.length || 0,
        preview: loansData.results?.slice(0, 2)
      });

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

        if (upsertError) {
          await logDebug(supabaseAdmin, userId, "LOAN_UPSERT_ERROR", `Erro ao salvar empréstimo: ${loan.id}`, { error: upsertError.message }, "error");
        } else {
          loansCount++;
          totalLoansAmount += loan.principalAmount || loan.contractedAmount || 0;
        }
      }
    } else {
      const loansErrorBody = await loansResponse.text();
      await logDebug(supabaseAdmin, userId, "LOANS_ERROR", `Erro ao buscar empréstimos: ${loansResponse.status}`, {
        status: loansResponse.status,
        body: loansErrorBody
      }, "error");
    }

    await logDebug(supabaseAdmin, userId, "LOANS_SYNC_DONE", `Empréstimos sincronizados: ${loansCount}`, { totalLoansAmount });

    // 4. Fetch and sync INVESTMENTS
    await logDebug(supabaseAdmin, userId, "FETCH_INVESTMENTS", "Iniciando fetch de investimentos");
    
    const investmentsResponse = await fetch(`https://api.pluggy.ai/investments?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });

    let investmentsCount = 0;
    let totalInvestments = 0;

    if (investmentsResponse.ok) {
      const investmentsData = await investmentsResponse.json();
      await logDebug(supabaseAdmin, userId, "INVESTMENTS_RESPONSE", `Resposta da Pluggy: ${investmentsResponse.status}`, {
        totalInvestments: investmentsData.results?.length || 0,
        preview: investmentsData.results?.slice(0, 2)
      });

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

        if (upsertError) {
          await logDebug(supabaseAdmin, userId, "INVESTMENT_UPSERT_ERROR", `Erro ao salvar investimento: ${investment.id}`, { error: upsertError.message }, "error");
        } else {
          investmentsCount++;
          totalInvestments += investment.balance || investment.value || 0;
        }
      }
    } else {
      const investmentsErrorBody = await investmentsResponse.text();
      await logDebug(supabaseAdmin, userId, "INVESTMENTS_ERROR", `Erro ao buscar investimentos: ${investmentsResponse.status}`, {
        status: investmentsResponse.status,
        body: investmentsErrorBody
      }, "error");
    }

    await logDebug(supabaseAdmin, userId, "INVESTMENTS_SYNC_DONE", `Investimentos sincronizados: ${investmentsCount}`, { totalInvestments });

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

    await logDebug(supabaseAdmin, userId, "SYNC_COMPLETE", "Sincronização concluída com sucesso", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    await logDebug(supabaseAdmin, userId, "SYNC_FATAL_ERROR", `Erro fatal na sincronização: ${message}`, { 
      error: message,
      stack: error instanceof Error ? error.stack : undefined
    }, "error");

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncTransactions(supabase: any, apiKey: string, accountId: string, dbUserId: string, logUserId: string) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);

  console.log(`[FETCH_TRANSACTIONS] Buscando transações para conta ${accountId}`);

  const transactionsResponse = await fetch(
    `https://api.pluggy.ai/transactions?accountId=${accountId}&from=${fromDate.toISOString().split('T')[0]}`,
    { headers: { "X-API-KEY": apiKey } }
  );

  if (!transactionsResponse.ok) {
    console.error(`[TRANSACTIONS_ERROR] Falha ao buscar transações: ${transactionsResponse.status}`);
    await supabase.from("debug_logs").insert({
      user_id: logUserId,
      function_name: "sync-bank-data",
      stage: "TRANSACTIONS_ERROR",
      message: `Falha ao buscar transações para conta ${accountId}: ${transactionsResponse.status}`,
      details: { accountId, status: transactionsResponse.status },
      level: "error",
    });
    return;
  }

  const transactionsData = await transactionsResponse.json();
  console.log(`[TRANSACTIONS_RESPONSE] Recebidas ${transactionsData.results?.length || 0} transações`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const tx of transactionsData.results || []) {
    // FIXED: Positive amount from Pluggy = RECEITA, Negative = DESPESA
    const tipo = tx.amount >= 0 ? "RECEITA" : "DESPESA";
    const valor = Math.abs(tx.amount);
    const item = tx.description || tx.descriptionRaw || "Transação bancária";
    const categoria = smartCategorize(item, tx.category || "");

    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("item", item)
      .eq("valor", valor)
      .eq("created_at", tx.date)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("transactions").insert({
        user_id: dbUserId,
        tipo,
        valor,
        item,
        categoria,
        forma_pagamento: "Banco",
        created_at: tx.date,
      });
      
      if (!error) {
        insertedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log(`[TRANSACTIONS_SYNC_DONE] Conta ${accountId}: ${insertedCount} inseridas, ${skippedCount} ignoradas (duplicatas)`);
}

// Smart categorization based on description patterns
function smartCategorize(description: string, pluggyCategory: string): string {
  const desc = description.toUpperCase();

  // Food & Delivery patterns
  if (desc.includes("IFOOD") || desc.includes("IFD*") || desc.includes("RAPPI") || 
      desc.includes("UBER EATS") || desc.includes("ZDELIVERY")) {
    return "Alimentação";
  }

  // Transport patterns
  if (desc.includes("UBER") || desc.includes("99") || desc.includes("CABIFY") || 
      desc.includes("LYFT") || desc.includes("POSTO") || desc.includes("SHELL") ||
      desc.includes("IPIRANGA") || desc.includes("BR MANIA")) {
    return "Transporte";
  }

  // Supermarkets
  if (desc.includes("CARREFOUR") || desc.includes("PAO DE ACUCAR") || 
      desc.includes("EXTRA") || desc.includes("ASSAI") || desc.includes("ATACADAO") ||
      desc.includes("BIG") || desc.includes("WALMART") || desc.includes("SUPERMERCADO")) {
    return "Alimentação";
  }

  // Streaming & Entertainment
  if (desc.includes("NETFLIX") || desc.includes("SPOTIFY") || desc.includes("AMAZON PRIME") ||
      desc.includes("DISNEY") || desc.includes("HBO") || desc.includes("GLOBOPLAY") ||
      desc.includes("YOUTUBE") || desc.includes("APPLE.COM")) {
    return "Lazer";
  }

  // E-commerce
  if (desc.includes("AMAZON") || desc.includes("MERCADO LIVRE") || desc.includes("MAGAZINELUIZA") ||
      desc.includes("AMERICANAS") || desc.includes("SHOPEE") || desc.includes("ALIEXPRESS")) {
    return "Compras";
  }

  // Bills & Utilities
  if (desc.includes("ENEL") || desc.includes("CPFL") || desc.includes("SABESP") ||
      desc.includes("COMGAS") || desc.includes("VIVO") || desc.includes("CLARO") ||
      desc.includes("TIM") || desc.includes("OI") || desc.includes("NET")) {
    return "Utilidades";
  }

  // Health
  if (desc.includes("DROGASIL") || desc.includes("DROGA RAIA") || desc.includes("PACHECO") ||
      desc.includes("DROGARIA") || desc.includes("FARMACIA") || desc.includes("HOSPITAL") ||
      desc.includes("CLINICA") || desc.includes("MEDICO")) {
    return "Saúde";
  }

  // Education
  if (desc.includes("ALURA") || desc.includes("UDEMY") || desc.includes("COURSERA") ||
      desc.includes("FACULDADE") || desc.includes("UNIVERSIDADE") || desc.includes("ESCOLA")) {
    return "Educação";
  }

  // Salary patterns
  if (desc.includes("SALARIO") || desc.includes("PAGAMENTO") || desc.includes("FOLHA") ||
      desc.includes("REMUNERACAO") || desc.includes("PRO-LABORE")) {
    return "Salário";
  }

  // Transfer patterns
  if (desc.includes("PIX") || desc.includes("TED") || desc.includes("DOC") ||
      desc.includes("TRANSF")) {
    return "Transferências";
  }

  // Fall back to Pluggy category mapping
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
