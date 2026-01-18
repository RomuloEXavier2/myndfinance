import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface DebugLog {
  id: string;
  user_id: string;
  function_name: string;
  stage: string;
  message: string;
  details: Record<string, any> | null;
  level: string;
  created_at: string;
}

export function useDebugLogs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["debug-logs", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("debug_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching debug logs:", error);
        throw error;
      }

      return data as DebugLog[];
    },
    enabled: !!user,
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("debug_logs")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debug-logs"] });
      toast.success("Logs limpos com sucesso");
    },
    onError: (error) => {
      console.error("Error clearing logs:", error);
      toast.error("Erro ao limpar logs");
    },
  });

  return {
    logs,
    isLoading,
    refetch,
    clearLogs: clearLogsMutation.mutate,
    isClearing: clearLogsMutation.isPending,
  };
}
