import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { Transaction } from "@/hooks/useTransactions";

interface CategoryPieChartProps {
  transactions: Transaction[];
}

const COLORS = [
  "hsl(var(--expense))",
  "hsl(var(--income))",
  "hsl(var(--reserve))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(217 91% 60%)",
  "hsl(280 65% 60%)",
  "hsl(38 92% 50%)",
];

export function CategoryPieChart({ transactions }: CategoryPieChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Group transactions by category
  const categoryData = transactions.reduce((acc, t) => {
    const cat = t.categoria || "Outros";
    if (!acc[cat]) {
      acc[cat] = 0;
    }
    acc[cat] += t.valor;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-xl">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm" style={{ color: data.payload.fill }}>
            {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (pieData.length === 0) {
    return (
      <Card className="card-glow fade-in border-border bg-card" style={{ animationDelay: "450ms" }}>
        <CardHeader>
          <CardTitle className="text-foreground">Por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] flex-col items-center justify-center gap-4">
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full bg-muted-foreground/30"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
          <p className="text-center text-muted-foreground">
            Nenhuma categoria para exibir.
            <br />
            <span className="text-sm">Adicione transações para ver a distribuição.</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glow fade-in border-border bg-card" style={{ animationDelay: "450ms" }}>
      <CardHeader>
        <CardTitle className="text-foreground">Por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {pieData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
