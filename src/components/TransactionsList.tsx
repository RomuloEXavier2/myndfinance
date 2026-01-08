import { Trash2, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/hooks/useTransactions";

interface TransactionsListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function TransactionsList({ transactions, onDelete }: TransactionsListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case "RECEITA":
        return TrendingUp;
      case "DESPESA":
        return TrendingDown;
      case "RESERVA":
        return PiggyBank;
      default:
        return TrendingUp;
    }
  };

  const getTypeStyles = (tipo: string) => {
    switch (tipo) {
      case "RECEITA":
        return {
          bg: "bg-income/10",
          text: "text-income",
          badge: "bg-income/20 text-income border-income/30",
        };
      case "DESPESA":
        return {
          bg: "bg-expense/10",
          text: "text-expense",
          badge: "bg-expense/20 text-expense border-expense/30",
        };
      case "RESERVA":
        return {
          bg: "bg-reserve/10",
          text: "text-reserve",
          badge: "bg-reserve/20 text-reserve border-reserve/30",
        };
      default:
        return {
          bg: "bg-muted",
          text: "text-foreground",
          badge: "bg-muted text-foreground",
        };
    }
  };

  if (transactions.length === 0) {
    return (
      <Card className="card-glow fade-in border-border bg-card" style={{ animationDelay: "500ms" }}>
        <CardHeader>
          <CardTitle className="text-foreground">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-center text-muted-foreground">
            Nenhuma transação ainda.
            <br />
            Diga algo como "Gastei 50 reais no mercado"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glow fade-in border-border bg-card" style={{ animationDelay: "500ms" }}>
      <CardHeader>
        <CardTitle className="text-foreground">Transações Recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.slice(0, 10).map((transaction, index) => {
          const styles = getTypeStyles(transaction.tipo);
          const Icon = getIcon(transaction.tipo);

          return (
            <div
              key={transaction.id}
              className={cn(
                "slide-up group flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn("rounded-lg p-2", styles.bg)}>
                  <Icon className={cn("h-5 w-5", styles.text)} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{transaction.item}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transaction.created_at)}
                    </span>
                    <Badge variant="outline" className={cn("text-xs", styles.badge)}>
                      {transaction.categoria}
                    </Badge>
                    {transaction.forma_pagamento && (
                      <Badge variant="outline" className="text-xs">
                        {transaction.forma_pagamento}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-lg font-semibold", styles.text)}>
                  {transaction.tipo === "DESPESA" ? "-" : "+"}
                  {formatCurrency(transaction.valor)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onDelete(transaction.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-expense" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
