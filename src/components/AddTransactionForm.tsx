import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AddTransactionFormProps {
  onAdd: (transaction: {
    item: string;
    valor: number;
    tipo: "RECEITA" | "DESPESA" | "RESERVA";
    categoria: string;
    forma_pagamento?: string;
  }) => void;
  isAdding: boolean;
}

const categorias = {
  RECEITA: ["Salário", "Freelance", "Investimentos", "Vendas", "Outros"],
  DESPESA: ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Outros"],
  RESERVA: ["Poupança", "Investimento", "Emergência", "Outros"],
};

const formasPagamento = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Transferência"];

export function AddTransactionForm({ onAdd, isAdding }: AddTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA" | "RESERVA">("DESPESA");
  const [categoria, setCategoria] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!item || isNaN(valorNum) || valorNum <= 0 || !categoria) {
      return;
    }

    onAdd({
      item,
      valor: valorNum,
      tipo,
      categoria,
      forma_pagamento: formaPagamento || undefined,
    });

    // Reset form
    setItem("");
    setValor("");
    setTipo("DESPESA");
    setCategoria("");
    setFormaPagamento("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="fixed bottom-8 left-8 z-50 h-12 w-12 rounded-full border-border bg-card shadow-lg hover:bg-accent"
          aria-label="Adicionar transação manual"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(value: "RECEITA" | "DESPESA" | "RESERVA") => {
                setTipo(value);
                setCategoria("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RECEITA">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-income" />
                    Receita
                  </span>
                </SelectItem>
                <SelectItem value="DESPESA">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-expense" />
                    Despesa
                  </span>
                </SelectItem>
                <SelectItem value="RESERVA">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-reserve" />
                    Reserva
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item">Descrição</Label>
            <Input
              id="item"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Ex: Almoço, Salário, Poupança"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              type="text"
              inputMode="decimal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias[tipo].map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formaPagamento">Forma de Pagamento (opcional)</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map((forma) => (
                  <SelectItem key={forma} value={forma}>
                    {forma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
