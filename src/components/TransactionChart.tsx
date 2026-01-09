import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ChartDataPoint } from "@/hooks/useTransactions";

interface TransactionChartProps {
  data: ChartDataPoint[];
}

export function TransactionChart({ data }: TransactionChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-xl">
          <p className="mb-2 font-medium text-foreground">{label}</p>
          {payload.map((entry: any) => (
            <p
              key={entry.dataKey}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card className="card-glow fade-in border-border bg-card" style={{ animationDelay: "400ms" }}>
        <CardHeader>
          <CardTitle className="text-foreground">Evolução Financeira</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] flex-col items-center justify-center gap-4">
          <div className="flex gap-3">
            <div className="h-16 w-1 rounded-full bg-income/30" />
            <div className="h-12 w-1 rounded-full bg-expense/30" />
            <div className="h-20 w-1 rounded-full bg-reserve/30" />
            <div className="h-8 w-1 rounded-full bg-income/30" />
            <div className="h-14 w-1 rounded-full bg-expense/30" />
          </div>
          <p className="text-center text-muted-foreground">
            Nenhuma transação registrada ainda.
            <br />
            <span className="text-sm">Use o microfone ou o botão + para começar!</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glow fade-in border-border bg-card" style={{ animationDelay: "400ms" }}>
      <CardHeader>
        <CardTitle className="text-foreground">Evolução Financeira</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="receitas"
              name="Receitas"
              stroke="hsl(var(--income))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--income))", strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              className="chart-glow-income"
            />
            <Line
              type="monotone"
              dataKey="despesas"
              name="Despesas"
              stroke="hsl(var(--expense))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--expense))", strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              className="chart-glow-expense"
            />
            <Line
              type="monotone"
              dataKey="reservas"
              name="Reservas"
              stroke="hsl(var(--reserve))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--reserve))", strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              className="chart-glow-reserve"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
