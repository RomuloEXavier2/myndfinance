import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingDown, Store, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function InsightsModule() {
  const { transactions } = useTransactions();
  const { totals: financeTotals, nextCreditDueDate } = useFinanceData();
  const { totalBalance } = useBankAccounts();
  const [isRecategorizing, setIsRecategorizing] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Analyze spending patterns
  const merchantAnalysis = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const monthlyTransactions = transactions.filter(
      t => t.tipo === "DESPESA" && new Date(t.created_at).getMonth() === currentMonth
    );

    // Group by item (merchant)
    const merchantSpending: Record<string, { total: number; count: number }> = {};
    monthlyTransactions.forEach(t => {
      const key = t.item.toLowerCase().trim();
      if (!merchantSpending[key]) {
        merchantSpending[key] = { total: 0, count: 0 };
      }
      merchantSpending[key].total += t.valor;
      merchantSpending[key].count++;
    });

    // Find top merchants
    return Object.entries(merchantSpending)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions]);

  // Count uncategorized transactions
  const uncategorizedCount = useMemo(() => {
    return transactions.filter(t => t.categoria === "Geral" || t.categoria === "Outros").length;
  }, [transactions]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const monthlyExpenses = transactions.filter(
      t => t.tipo === "DESPESA" && new Date(t.created_at).getMonth() === currentMonth
    );

    const categories: Record<string, number> = {};
    monthlyExpenses.forEach(t => {
      categories[t.categoria] = (categories[t.categoria] || 0) + t.valor;
    });

    return Object.entries(categories)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions]);

  // Recategorize all "Geral" transactions using AI
  const handleRecategorize = async () => {
    setIsRecategorizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("recategorize-transactions");
      
      if (error) throw error;
      
      toast.success(`${data.updated || 0} transações recategorizadas com sucesso!`);
    } catch (error) {
      console.error("Recategorization error:", error);
      toast.error("Erro ao recategorizar transações");
    } finally {
      setIsRecategorizing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Coach Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente Financeiro IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Insights personalizados baseados nos seus dados bancários reais.
          </p>
        </CardContent>
      </Card>

      {/* Credit Warning */}
      {financeTotals.creditAvailable > 0 && nextCreditDueDate && (
        <Card className="border-expense/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-expense/20 p-2 shrink-0">
                <AlertTriangle className="h-4 w-4 text-expense" />
              </div>
              <div>
                <p className="font-medium text-foreground">Atenção ao Crédito</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você tem {formatCurrency(financeTotals.creditAvailable)} de crédito disponível, 
                  mas sua fatura vence em breve. Evite gastos não essenciais.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Merchants */}
      {merchantAnalysis.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4 w-4" />
              Onde você mais gasta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {merchantAnalysis.map((merchant, index) => (
              <div 
                key={merchant.name} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg font-bold text-muted-foreground shrink-0">
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground capitalize truncate">
                      {merchant.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {merchant.count} transação{merchant.count !== 1 ? 'ões' : ''}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-expense shrink-0 ml-4">
                  {formatCurrency(merchant.total)}
                </p>
              </div>
            ))}

            {merchantAnalysis[0] && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary inline mr-1" />
                  <span className="font-medium text-foreground">Dica: </span>
                  Você gastou {formatCurrency(merchantAnalysis[0].total)} em "{merchantAnalysis[0].name}" este mês.
                  Que tal definir uma meta de economia de 10% para o próximo mês?
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground">{cat.name}</span>
                <span className="font-medium text-expense">{formatCurrency(cat.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recategorize Tool */}
      {uncategorizedCount > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {uncategorizedCount} transações sem categoria
                </p>
                <p className="text-sm text-muted-foreground">
                  Use a IA para categorizar automaticamente
                </p>
              </div>
              <Button 
                onClick={handleRecategorize}
                disabled={isRecategorizing}
                className="shrink-0"
              >
                {isRecategorizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recategorizar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Health Summary */}
      <Card className="bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Saúde Financeira</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo em Conta</span>
              <span className="font-medium text-income">{formatCurrency(totalBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Investimentos</span>
              <span className="font-medium text-reserve">{formatCurrency(financeTotals.investments)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dívidas</span>
              <span className="font-medium text-expense">{formatCurrency(financeTotals.loansAmount)}</span>
            </div>
            <hr className="border-border my-2" />
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Patrimônio Líquido</span>
              <span className="font-bold text-primary">
                {formatCurrency(totalBalance + financeTotals.investments - financeTotals.loansAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
