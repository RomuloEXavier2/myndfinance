import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TransactionTotals } from "@/hooks/useTransactions";

interface SummaryCardsProps {
  totals: TransactionTotals;
}

export function SummaryCards({ totals }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const cards = [
    {
      title: "Receitas",
      value: totals.receitas,
      icon: TrendingUp,
      gradient: "gradient-income",
      iconColor: "text-income-foreground",
      delay: "0ms",
    },
    {
      title: "Despesas",
      value: totals.despesas,
      icon: TrendingDown,
      gradient: "gradient-expense",
      iconColor: "text-expense-foreground",
      delay: "100ms",
    },
    {
      title: "Reservas",
      value: totals.reservas,
      icon: PiggyBank,
      gradient: "gradient-reserve",
      iconColor: "text-reserve-foreground",
      delay: "200ms",
    },
    {
      title: "Saldo",
      value: totals.saldo,
      icon: Wallet,
      gradient: totals.saldo >= 0 ? "gradient-income" : "gradient-expense",
      iconColor: "text-primary-foreground",
      delay: "300ms",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={cn(
            "card-glow fade-in overflow-hidden border-0",
            card.gradient
          )}
          style={{ animationDelay: card.delay }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{card.title}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-white number-animate">
                  {formatCurrency(card.value)}
                </p>
              </div>
              <div className="rounded-xl bg-white/20 p-3">
                <card.icon className={cn("h-6 w-6", card.iconColor)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
