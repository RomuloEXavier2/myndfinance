import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Calendar, AlertTriangle } from "lucide-react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function CardsModule() {
  const { creditCards, totals, isLoading } = useFinanceData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Resumo dos Cartões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Limite Total</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(totals.creditLimit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponível</p>
              <p className="text-xl font-bold text-income">
                {formatCurrency(totals.creditAvailable)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fatura Atual</p>
              <p className="text-xl font-bold text-expense">
                {formatCurrency(totals.currentBills)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards List */}
      {creditCards.length > 0 ? (
        <div className="grid gap-4">
          {creditCards.map((card) => {
            const usagePercent = card.limit_total > 0 
              ? ((card.limit_total - card.limit_available) / card.limit_total) * 100 
              : 0;
            
            const daysUntilDue = card.due_date
              ? differenceInDays(new Date(card.due_date), new Date())
              : null;

            const isUrgent = daysUntilDue !== null && daysUntilDue <= 5;
            const isHighUsage = usagePercent > 80;

            return (
              <Card 
                key={card.id} 
                className={cn(
                  "overflow-hidden",
                  isUrgent && "border-expense/50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary shrink-0" />
                        <p className="font-semibold text-foreground truncate">
                          {card.card_name || "Cartão de Crédito"}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {card.bank_name}
                      </p>
                    </div>
                    {isUrgent && (
                      <div className="shrink-0 ml-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-expense/10 text-expense">
                          <AlertTriangle className="h-3 w-3" />
                          {daysUntilDue}d
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Limit Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Limite utilizado</span>
                      <span className={cn(
                        "font-medium",
                        isHighUsage ? "text-expense" : "text-foreground"
                      )}>
                        {usagePercent.toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={usagePercent} 
                      className={cn(
                        "h-2",
                        isHighUsage && "[&>div]:bg-expense"
                      )}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Disponível: {formatCurrency(card.limit_available)}</span>
                      <span>Total: {formatCurrency(card.limit_total)}</span>
                    </div>
                  </div>

                  {/* Due Date & Bill */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {card.due_date && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Vencimento</p>
                          <p className={cn(
                            "text-sm font-medium",
                            isUrgent ? "text-expense" : "text-foreground"
                          )}>
                            {format(new Date(card.due_date), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}
                    {card.current_bill !== null && card.current_bill > 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Fatura Atual</p>
                          <p className="text-sm font-medium text-expense">
                            {formatCurrency(card.current_bill)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Nenhum cartão encontrado. Conecte seu banco para visualizar seus cartões.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
