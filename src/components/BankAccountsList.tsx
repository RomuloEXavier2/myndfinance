import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBankAccounts, BankAccount } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Landmark, Loader2, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function BankAccountsList() {
  const { bankAccounts, totalBalance, isLoading, refetch } = useBankAccounts();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleDisconnect = async (account: BankAccount) => {
    setDisconnectingId(account.id);
    try {
      const { error } = await supabase.functions.invoke("disconnect-bank", {
        body: { itemId: account.pluggy_item_id },
      });

      if (error) throw error;

      toast({
        title: "Banco desconectado",
        description: `${account.bank_name} foi removido com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    } catch (error: any) {
      toast({
        title: "Erro ao desconectar",
        description: error.message || "Não foi possível desconectar o banco",
        variant: "destructive",
      });
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleSync = async (account: BankAccount) => {
    setSyncingId(account.id);
    try {
      const { data, error } = await supabase.functions.invoke("sync-bank-data", {
        body: { itemId: account.pluggy_item_id },
      });

      if (error) throw error;

      toast({
        title: "Sincronização concluída!",
        description: `${data?.synced?.accounts || 0} contas, ${data?.synced?.creditCards || 0} cartões, ${data?.synced?.investments || 0} investimentos atualizados.`,
      });

      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Não foi possível sincronizar os dados",
        variant: "destructive",
      });
    } finally {
      setSyncingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (bankAccounts.length === 0) {
    return null;
  }

  // Group accounts by bank
  const accountsByBank = bankAccounts.reduce((acc, account) => {
    const key = account.pluggy_item_id;
    if (!acc[key]) {
      acc[key] = {
        bankName: account.bank_name,
        itemId: account.pluggy_item_id,
        accounts: [],
        totalBalance: 0,
      };
    }
    acc[key].accounts.push(account);
    acc[key].totalBalance += account.balance || 0;
    return acc;
  }, {} as Record<string, { bankName: string; itemId: string; accounts: BankAccount[]; totalBalance: number }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Contas Conectadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.values(accountsByBank).map((bank) => (
          <div
            key={bank.itemId}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
          >
            <div className="flex-1">
              <h4 className="font-semibold">{bank.bankName}</h4>
              <p className="text-sm text-muted-foreground">
                {bank.accounts.length} conta{bank.accounts.length > 1 ? "s" : ""}
              </p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(bank.totalBalance)}
              </p>
              {bank.accounts[0]?.last_sync_at && (
                <p className="text-xs text-muted-foreground">
                  Última atualização: {format(new Date(bank.accounts[0].last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleSync(bank.accounts[0])}
                disabled={syncingId === bank.accounts[0].id}
              >
                {syncingId === bank.accounts[0].id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={disconnectingId === bank.accounts[0].id}
                  >
                    {disconnectingId === bank.accounts[0].id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desconectar {bank.bankName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá remover a conexão com este banco. Suas transações existentes serão mantidas, mas não haverá mais sincronização automática.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDisconnect(bank.accounts[0])}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Desconectar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Saldo Total</span>
            <span className="text-xl font-bold">{formatCurrency(totalBalance)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
