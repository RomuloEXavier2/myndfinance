import { TrendingUp, TrendingDown, Wallet, PiggyBank, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TransactionTotals } from "@/hooks/useTransactions";

interface SummaryCardsProps {
  totals: TransactionTotals;
  bankBalance?: number;
}

export function SummaryCards({ totals, bankBalance = 0 }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Use bank balance as primary balance if available, otherwise use calculated
  const displayBalance = bankBalance > 0 ? bankBalance : totals.saldo;
  const hasRealBalance = bankBalance > 0;

  const cards = [
    // Primary: Real Bank Balance (if connected)
    ...(hasRealBalance ? [{
      title: "Saldo Real",
      value: bankBalance,
      icon: Building2,
      gradient: "bg-gradient-to-br from-primary to-primary/80",
      iconColor: "text-primary-foreground",
      delay: "0ms",
      isPrimary: true,
    }] : []),
    {
      title: "Receitas",
      value: totals.receitas,
      icon: TrendingUp,
      gradient: "gradient-income",
      iconColor: "text-income-foreground",
      delay: hasRealBalance ? "100ms" : "0ms",
    },
    {
      title: "Despesas",
      value: totals.despesas,
      icon: TrendingDown,
      gradient: "gradient-expense",
      iconColor: "text-expense-foreground",
      delay: hasRealBalance ? "200ms" : "100ms",
    },
    {
      title: "Reservas",
      value: totals.reservas,
      icon: PiggyBank,
      gradient: "gradient-reserve",
      iconColor: "text-reserve-foreground",
      delay: hasRealBalance ? "300ms" : "200ms",
    },
    // Only show calculated balance if no bank connection
    ...(!hasRealBalance ? [{
      title: "Saldo",
      value: totals.saldo,
      icon: Wallet,
      gradient: totals.saldo >= 0 ? "gradient-income" : "gradient-expense",
      iconColor: "text-primary-foreground",
      delay: "300ms",
    }] : []),
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={cn(
            "card-glow fade-in overflow-hidden border-0",
            card.gradient,
            card.isPrimary && "col-span-2 lg:col-span-1"
          )}
          style={{ animationDelay: card.delay }}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-white/80 truncate">
                  {card.title}
                </p>
                <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold tracking-tight text-white number-animate truncate">
                  {formatCurrency(card.value)}
                </p>
              </div>
              <div className="rounded-lg sm:rounded-xl bg-white/20 p-2 sm:p-3 shrink-0 ml-2">
                <card.icon className={cn("h-4 w-4 sm:h-6 sm:w-6", card.iconColor)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
