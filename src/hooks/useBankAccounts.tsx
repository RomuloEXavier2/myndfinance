import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface BankAccount {
  id: string;
  user_id: string;
  pluggy_item_id: string;
  pluggy_account_id: string;
  bank_name: string;
  account_type: string;
  balance: number;
  currency: string;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

export function useBankAccounts() {
  const { user } = useAuth();

  const { data: bankAccounts = [], isLoading, refetch } = useQuery({
    queryKey: ["bank-accounts", user?.id],
    queryFn: async (): Promise<BankAccount[]> => {
      if (!user) return [];

      // Use raw fetch since bank_accounts isn't in generated types yet
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/bank_accounts?user_id=eq.${user.id}&order=created_at.desc`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Error fetching bank accounts");
        return [];
      }

      return response.json();
    },
    enabled: !!user,
  });

  const totalBalance = bankAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);

  return {
    bankAccounts,
    totalBalance,
    isLoading,
    refetch,
  };
}
