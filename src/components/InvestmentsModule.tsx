import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet, Calculator, Sparkles } from "lucide-react";
import { useFinanceData, Investment } from "@/hooks/useFinanceData";
import { useTransactions } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InvestmentsModule() {
  const { investments, totals, isLoading } = useFinanceData();
  const { transactions } = useTransactions();
  
  // Investment simulation state
  const [showSimulation, setShowSimulation] = useState(false);
  
  // Calculate non-essential spending for simulation
  const nonEssentialCategories = ["Lazer", "Compras", "Entretenimento", "Viagem", "Shopping"];
  const nonEssentialSpending = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return transactions
      .filter(t => 
        t.tipo === "DESPESA" && 
        nonEssentialCategories.some(cat => 
          t.categoria.toLowerCase().includes(cat.toLowerCase())
        ) &&
        new Date(t.created_at).getMonth() === currentMonth
      )
      .reduce((sum, t) => sum + t.valor, 0);
  }, [transactions]);

  // CDI simulation (100% CDI ~ 13.75% annual rate)
  const cdiRate = 0.1375;
  const simulatedValueOneYear = nonEssentialSpending * (1 + cdiRate);
  const simulatedValueFiveYears = nonEssentialSpending * Math.pow(1 + cdiRate, 5);

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
      {/* Portfolio Summary */}
      <Card className="bg-gradient-to-br from-reserve/10 to-reserve/5 border-reserve/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-reserve" />
            Portfólio de Investimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(totals.investments)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Total investido em {investments.length} aplicação{investments.length !== 1 ? 'ões' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Investment Breakdown */}
      {investments.length > 0 ? (
        <div className="grid gap-3">
          {investments.map((investment) => (
            <Card key={investment.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {investment.name || "Investimento"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {investment.bank_name} • {investment.investment_type || "Outros"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold text-reserve">
                      {formatCurrency(investment.total_saved)}
                    </p>
                    {investment.annual_rate && investment.annual_rate > 0 && (
                      <p className="text-xs text-income">
                        {investment.annual_rate.toFixed(2)}% a.a.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Nenhum investimento encontrado. Conecte seu banco para visualizar seu portfólio.
            </p>
          </CardContent>
        </Card>
      )}

      {/* What-If Simulation */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" />
            E se você investisse?
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nonEssentialSpending > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este mês você gastou{" "}
                <span className="font-semibold text-expense">
                  {formatCurrency(nonEssentialSpending)}
                </span>{" "}
                em gastos não essenciais (lazer, compras, etc.).
              </p>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">Em 1 ano (CDB 100% CDI)</p>
                  <p className="text-lg font-bold text-income">
                    {formatCurrency(simulatedValueOneYear)}
                  </p>
                  <p className="text-xs text-income">
                    +{formatCurrency(simulatedValueOneYear - nonEssentialSpending)}
                  </p>
                </div>
                <div className="rounded-lg bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">Em 5 anos (CDB 100% CDI)</p>
                  <p className="text-lg font-bold text-income">
                    {formatCurrency(simulatedValueFiveYears)}
                  </p>
                  <p className="text-xs text-income">
                    +{formatCurrency(simulatedValueFiveYears - nonEssentialSpending)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Dica do CFO: </span>
                  Que tal definir uma meta de economia de 10% para o próximo mês? Pequenos passos geram grandes resultados.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Continue registrando suas transações para ver simulações personalizadas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
