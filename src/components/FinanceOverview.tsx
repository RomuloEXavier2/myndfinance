import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Landmark, TrendingUp, AlertTriangle } from "lucide-react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function FinanceOverview() {
  const { totals, nextCreditDueDate, isLoading: isLoadingFinance } = useFinanceData();
  const { totalBalance, isLoading: isLoadingAccounts } = useBankAccounts();

  const isLoading = isLoadingFinance || isLoadingAccounts;

  const patrimonio = totalBalance + totals.investments - totals.loansAmount;

  const daysUntilDue = nextCreditDueDate
    ? differenceInDays(new Date(nextCreditDueDate), new Date())
    : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return null;
  }

  // Don't render if no finance data
  if (totals.creditLimit === 0 && totals.loansAmount === 0 && totals.investments === 0 && totalBalance === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Patrimônio Total */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" />
            Patrimônio Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(patrimonio)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Saldos + Investimentos - Empréstimos
          </p>
        </CardContent>
      </Card>

      {/* Credit & Loans Section */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Credit Card Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Crédito Disponível Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">
              {formatCurrency(totals.creditAvailable)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {formatCurrency(totals.creditLimit)} limite total
            </p>
            {nextCreditDueDate && daysUntilDue !== null && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${daysUntilDue <= 5 ? 'text-expense' : 'text-muted-foreground'}`}>
                {daysUntilDue <= 5 && <AlertTriangle className="h-3 w-3" />}
                Próximo vencimento: {format(new Date(nextCreditDueDate), "dd 'de' MMMM", { locale: ptBR })}
                {daysUntilDue <= 5 && ` (${daysUntilDue} dias!)`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loans Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Landmark className="h-4 w-4" />
              Total em Empréstimos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              {formatCurrency(totals.loansAmount)}
            </div>
            {totals.loansAvailable > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(totals.loansAvailable)} disponível para contratação
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Investments Summary */}
      {totals.investments > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-reserve">
              {formatCurrency(totals.investments)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
