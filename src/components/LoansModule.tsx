import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, AlertTriangle, TrendingDown, CreditCard, Sparkles } from "lucide-react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

export function LoansModule() {
  const { loans, creditCards, totals, nextCreditDueDate, isLoading: isLoadingFinance } = useFinanceData();
  const { totalBalance, isLoading: isLoadingAccounts } = useBankAccounts();

  const isLoading = isLoadingFinance || isLoadingAccounts;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const daysUntilDue = nextCreditDueDate
    ? differenceInDays(new Date(nextCreditDueDate), new Date())
    : null;

  // Calculate debt-to-asset ratio
  const totalDebt = totals.loansAmount + totals.currentBills;
  const debtRatio = totalBalance > 0 ? (totalDebt / totalBalance) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Debt Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Available Credit */}
        <Card className="bg-gradient-to-br from-income/10 to-income/5 border-income/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Crédito Disponível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">
              {formatCurrency(totals.creditAvailable)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {formatCurrency(totals.creditLimit)} limite total
            </p>
            <Progress 
              value={(totals.creditAvailable / Math.max(totals.creditLimit, 1)) * 100} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        {/* Total Debt */}
        <Card className="bg-gradient-to-br from-expense/10 to-expense/5 border-expense/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              Dívida Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              {formatCurrency(totalDebt)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Empréstimos + Faturas
            </p>
            {debtRatio > 50 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-expense">
                <AlertTriangle className="h-3 w-3" />
                Dívida representa {debtRatio.toFixed(0)}% do seu saldo
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Due Date Warning */}
      {nextCreditDueDate && daysUntilDue !== null && daysUntilDue <= 7 && (
        <Card className="border-expense/50 bg-expense/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-expense/20 p-2">
                <AlertTriangle className="h-5 w-5 text-expense" />
              </div>
              <div>
                <p className="font-medium text-foreground">Fatura próxima do vencimento</p>
                <p className="text-sm text-muted-foreground">
                  Vence em {format(new Date(nextCreditDueDate), "dd 'de' MMMM", { locale: ptBR })} 
                  {daysUntilDue <= 3 && <span className="text-expense font-medium"> ({daysUntilDue} dia{daysUntilDue !== 1 ? 's' : ''}!)</span>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loans List */}
      {loans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" />
              Empréstimos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loans.map((loan) => (
              <div 
                key={loan.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {loan.loan_type || "Empréstimo"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {loan.bank_name}
                    {loan.interest_rate && loan.interest_rate > 0 && ` • ${loan.interest_rate.toFixed(2)}% a.a.`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-semibold text-expense">
                    {formatCurrency(loan.amount_taken)}
                  </p>
                  {loan.monthly_payment && loan.monthly_payment > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(loan.monthly_payment)}/mês
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Credit Cards List */}
      {creditCards.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Cartões de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {creditCards.map((card) => (
              <div 
                key={card.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {card.card_name || "Cartão de Crédito"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.bank_name}
                    {card.due_date && ` • Vence ${format(new Date(card.due_date), "dd/MM")}`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-semibold text-income">
                    {formatCurrency(card.limit_available)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de {formatCurrency(card.limit_total)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {loans.length === 0 && creditCards.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Landmark className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Nenhum empréstimo ou cartão encontrado. Conecte seu banco para visualizar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Insight */}
      {totals.currentBills > 0 && totals.creditLimit > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-1">Insight do CFO</p>
                <p className="text-sm text-muted-foreground">
                  Você tem {formatCurrency(totals.creditAvailable)} de crédito disponível
                  {nextCreditDueDate && daysUntilDue !== null && daysUntilDue <= 10 && (
                    <>, mas sua fatura vence em <span className="text-expense font-medium">{daysUntilDue} dias</span>. Planeje seus gastos!</>
                  )}
                  {(!nextCreditDueDate || daysUntilDue === null || daysUntilDue > 10) && (
                    <>. Use com sabedoria!</>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
