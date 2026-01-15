import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CreditCard {
  id: string;
  user_id: string;
  pluggy_card_id: string | null;
  bank_name: string;
  card_name: string | null;
  limit_total: number;
  limit_available: number;
  current_bill: number;
  due_date: string | null;
  closing_date: string | null;
}

export interface Loan {
  id: string;
  user_id: string;
  pluggy_loan_id: string | null;
  bank_name: string;
  loan_type: string | null;
  amount_available: number;
  amount_taken: number;
  interest_rate: number | null;
  monthly_payment: number | null;
  due_date: string | null;
}

export interface Investment {
  id: string;
  user_id: string;
  pluggy_investment_id: string | null;
  bank_name: string;
  investment_type: string | null;
  name: string | null;
  total_saved: number;
  currency: string;
  annual_rate: number | null;
}

async function fetchData<T>(tableName: string, userId: string): Promise<T[]> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${tableName}?user_id=eq.${userId}&order=created_at.desc`,
    {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    }
  );

  if (!response.ok) {
    console.error(`Error fetching ${tableName}`);
    return [];
  }

  return response.json();
}

export function useFinanceData() {
  const { user } = useAuth();

  const { data: creditCards = [], isLoading: isLoadingCards, refetch: refetchCards } = useQuery({
    queryKey: ["credit-cards", user?.id],
    queryFn: () => fetchData<CreditCard>("credit_cards", user!.id),
    enabled: !!user,
  });

  const { data: loans = [], isLoading: isLoadingLoans, refetch: refetchLoans } = useQuery({
    queryKey: ["loans", user?.id],
    queryFn: () => fetchData<Loan>("loans", user!.id),
    enabled: !!user,
  });

  const { data: investments = [], isLoading: isLoadingInvestments, refetch: refetchInvestments } = useQuery({
    queryKey: ["investments", user?.id],
    queryFn: () => fetchData<Investment>("investments", user!.id),
    enabled: !!user,
  });

  const totalCreditLimit = creditCards.reduce((sum, card) => sum + (card.limit_total || 0), 0);
  const totalCreditAvailable = creditCards.reduce((sum, card) => sum + (card.limit_available || 0), 0);
  const totalCurrentBills = creditCards.reduce((sum, card) => sum + (card.current_bill || 0), 0);
  
  const totalLoansAmount = loans.reduce((sum, loan) => sum + (loan.amount_taken || 0), 0);
  const totalLoansAvailable = loans.reduce((sum, loan) => sum + (loan.amount_available || 0), 0);
  
  const totalInvestments = investments.reduce((sum, inv) => sum + (inv.total_saved || 0), 0);

  const nextCreditDueDate = creditCards
    .filter(card => card.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]?.due_date;

  const refetchAll = () => {
    refetchCards();
    refetchLoans();
    refetchInvestments();
  };

  return {
    creditCards,
    loans,
    investments,
    totals: {
      creditLimit: totalCreditLimit,
      creditAvailable: totalCreditAvailable,
      currentBills: totalCurrentBills,
      loansAmount: totalLoansAmount,
      loansAvailable: totalLoansAvailable,
      investments: totalInvestments,
    },
    nextCreditDueDate,
    isLoading: isLoadingCards || isLoadingLoans || isLoadingInvestments,
    refetch: refetchAll,
  };
}
