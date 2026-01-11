import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  user_id: string;
  item: string;
  valor: number;
  tipo: "RECEITA" | "DESPESA" | "RESERVA";
  categoria: string;
  forma_pagamento: string | null;
  created_at: string;
}

export interface TransactionTotals {
  receitas: number;
  despesas: number;
  reservas: number;
  saldo: number;
}

export interface ChartDataPoint {
  date: string;
  receitas: number;
  despesas: number;
  reservas: number;
}

// Compute totals from transactions
function computeTotals(transactions: Transaction[]): TransactionTotals {
  const receitas = transactions
    .filter((t) => t.tipo === "RECEITA")
    .reduce((sum, t) => sum + t.valor, 0);

  const despesas = transactions
    .filter((t) => t.tipo === "DESPESA")
    .reduce((sum, t) => sum + t.valor, 0);

  const reservas = transactions
    .filter((t) => t.tipo === "RESERVA")
    .reduce((sum, t) => sum + t.valor, 0);

  return {
    receitas,
    despesas,
    reservas,
    saldo: receitas - despesas,
  };
}

// Compute chart data from transactions
function computeChartData(transactions: Transaction[]): ChartDataPoint[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const groupedData: Record<string, { receitas: number; despesas: number; reservas: number }> = {};

  sorted.forEach((t) => {
    const date = new Date(t.created_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });

    if (!groupedData[date]) {
      groupedData[date] = { receitas: 0, despesas: 0, reservas: 0 };
    }

    if (t.tipo === "RECEITA") groupedData[date].receitas += t.valor;
    else if (t.tipo === "DESPESA") groupedData[date].despesas += t.valor;
    else if (t.tipo === "RESERVA") groupedData[date].reservas += t.valor;
  });

  return Object.entries(groupedData).map(([date, values]) => ({
    date,
    ...values,
  }));
}

export function useTransactions() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Single query for all transactions
  const transactionsQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!session,
  });

  // Real-time subscription for instant UI updates
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("transactions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, queryClient]);

  const processVoiceMutation = useMutation({
    mutationFn: async (audioBase64: string): Promise<{ 
      action?: string; 
      transaction?: Transaction; 
      message?: string; 
      transcription?: string;
    }> => {
      const { data, error } = await supabase.functions.invoke("process-voice", {
        body: { audioBase64 },
      });

      // Handle edge function errors
      if (error) {
        const errorContext = (error as any).context;
        if (errorContext) {
          const status = errorContext.status;
          
          // Try to parse the error body
          try {
            const errorBody = await errorContext.json();
            const errorMessage = errorBody.error || "Erro ao processar áudio";
            const transcription = errorBody.transcription || "";
            
            // Return specific messages based on status
            if (status === 500) {
              const err = new Error("Ops! Tivemos um problema ao processar seu áudio. Por favor, tente novamente.");
              (err as any).transcription = transcription;
              throw err;
            }
            if (status === 429) {
              throw new Error("Limite de requisições excedido. Aguarde um momento.");
            }
            if (status === 402) {
              throw new Error("Créditos insuficientes. Contate o suporte.");
            }
            
            // Attach transcription to error for display
            const customError = new Error(errorMessage);
            (customError as any).transcription = transcription;
            throw customError;
          } catch (parseError) {
            // If it's our own thrown error, re-throw it
            if (parseError instanceof Error && parseError.message !== "Unexpected end of JSON input") {
              throw parseError;
            }
            // Otherwise, generic error
            throw new Error("Erro ao processar áudio");
          }
        }
        throw new Error("Erro de conexão com o servidor");
      }

      // Handle errors returned in the data payload
      if (data?.error) {
        const customError = new Error(data.error);
        (customError as any).transcription = data.transcription || "";
        throw customError;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      if (data.action === "DELETE_LAST") {
        toast.success("Última transação excluída");
      } else if (data.transaction) {
        toast.success(data.message || "Transação registrada!");
      }
    },
    onError: (error: Error & { transcription?: string }) => {
      const message = error.message || "";
      const transcription = error.transcription || "";
      
      // Build error message with transcription if available
      let displayMessage = message || "Ops! Tivemos um problema ao processar seu áudio. Por favor, tente novamente.";
      
      // Replace legacy "papo furado" with professional message
      if (message.toLowerCase().includes("furado") || message.toLowerCase().includes("papo")) {
        displayMessage = "Nenhuma transação financeira identificada no áudio.";
      } else if (message.includes("conexão") || message.includes("servidor") || message.includes("500")) {
        displayMessage = "Ops! Tivemos um problema ao processar seu áudio. Por favor, tente novamente.";
      }
      
      // Show transcription in the error if available
      if (transcription && displayMessage.includes("Nenhuma transação")) {
        toast.error(`${displayMessage}\n\nIA ouviu: "${transcription}"`);
      } else {
        toast.error(displayMessage);
      }
    },
  });

  // Manual transaction creation
  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: {
      item: string;
      valor: number;
      tipo: "RECEITA" | "DESPESA" | "RESERVA";
      categoria: string;
      forma_pagamento?: string;
    }) => {
      if (!session?.user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: session.user.id,
          item: transaction.item,
          valor: transaction.valor,
          tipo: transaction.tipo,
          categoria: transaction.categoria,
          forma_pagamento: transaction.forma_pagamento || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transação adicionada!");
    },
    onError: () => {
      toast.error("Erro ao adicionar transação");
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transação excluída");
    },
    onError: () => {
      toast.error("Erro ao excluir transação");
    },
  });

  // Derive totals and chart data from the single transactions query
  const transactions = transactionsQuery.data || [];
  const totals = computeTotals(transactions);
  const chartData = computeChartData(transactions);

  return {
    transactions,
    totals,
    chartData,
    isLoading: transactionsQuery.isLoading,
    processVoice: processVoiceMutation.mutateAsync,
    isProcessing: processVoiceMutation.isPending,
    addTransaction: addTransactionMutation.mutate,
    isAdding: addTransactionMutation.isPending,
    deleteTransaction: deleteTransactionMutation.mutate,
  };
}
