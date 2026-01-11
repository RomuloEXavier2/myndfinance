import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Transaction } from "@/hooks/useTransactions";

interface PaymentMethodsChartProps {
  transactions: Transaction[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--income))",
  "hsl(var(--expense))",
  "hsl(var(--reserve))",
  "hsl(var(--muted-foreground))",
];

export function PaymentMethodsChart({ transactions }: PaymentMethodsChartProps) {
  // Group transactions by payment method
  const paymentData = transactions.reduce((acc, t) => {
    const method = t.forma_pagamento || "Não informado";
    if (!acc[method]) {
      acc[method] = 0;
    }
    acc[method] += t.valor;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(paymentData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 payment methods

  const hasData = chartData.length > 0;

  return (
    <Card className="fade-in border-border bg-card/50 backdrop-blur-sm" style={{ animationDelay: "400ms" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">
          Formas de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                tickFormatter={(value) => `R$ ${value.toLocaleString("pt-BR")}`}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={100}
              />
              <Tooltip
                formatter={(value: number) => [
                  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  "Total",
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[280px] items-center justify-center">
            <p className="text-muted-foreground">
              Adicione transações para ver as formas de pagamento
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
