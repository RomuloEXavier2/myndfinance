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

export function useTransactions() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

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

  const totalsQuery = useQuery({
    queryKey: ["transaction-totals"],
    queryFn: async (): Promise<TransactionTotals> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("valor, tipo");

      if (error) throw error;

      const transactions = data || [];
      
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
    },
    enabled: !!session,
  });

  const chartDataQuery = useQuery({
    queryKey: ["chart-data"],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("valor, tipo, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date
      const groupedData: Record<string, { receitas: number; despesas: number; reservas: number }> = {};
      
      (data || []).forEach((t) => {
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
    },
    enabled: !!session,
  });

  const processVoiceMutation = useMutation({
    mutationFn: async (audioBase64: string) => {
      const { data, error } = await supabase.functions.invoke("process-voice", {
        body: { audioBase64 },
      });

      // Handle edge function errors - parse the error context for the actual message
      if (error) {
        // Try to get the error message from the response body
        const errorContext = (error as any).context;
        if (errorContext) {
          try {
            const errorBody = await errorContext.json();
            throw new Error(errorBody.error || "Erro ao processar áudio");
          } catch (parseError) {
            // If parsing fails, use the original error
            throw error;
          }
        }
        throw error;
      }
      
      // Handle errors returned in the data payload
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-totals"] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      
      if (data.action === "DELETE_LAST") {
        toast.success("Última transação excluída");
      } else if (data.transaction) {
        toast.success(data.message || "Transação registrada!");
      }
    },
    onError: (error: Error) => {
      // Show friendly error message
      toast.error(error.message || "Erro ao processar áudio");
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
      queryClient.invalidateQueries({ queryKey: ["transaction-totals"] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      toast.success("Transação excluída");
    },
    onError: () => {
      toast.error("Erro ao excluir transação");
    },
  });

  return {
    transactions: transactionsQuery.data || [],
    totals: totalsQuery.data || { receitas: 0, despesas: 0, reservas: 0, saldo: 0 },
    chartData: chartDataQuery.data || [],
    isLoading: transactionsQuery.isLoading || totalsQuery.isLoading,
    processVoice: processVoiceMutation.mutateAsync,
    isProcessing: processVoiceMutation.isPending,
    deleteTransaction: deleteTransactionMutation.mutate,
  };
}
