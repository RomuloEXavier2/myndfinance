import { useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import { Button } from "@/components/ui/button";
import { Landmark, Loader2, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ConnectBankButton() {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pluggy-connect-token");
      
      if (error) {
        throw new Error(error.message);
      }

      if (data?.connectToken) {
        setConnectToken(data.connectToken);
      } else {
        throw new Error("Não foi possível obter o token de conexão");
      }
    } catch (error: any) {
      console.error("Error getting connect token:", error);
      toast({
        title: "Erro ao conectar",
        description: error.message || "Não foi possível iniciar a conexão com o banco",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async (itemData: any) => {
    console.log("Bank connected successfully:", itemData);
    setConnectToken(null);
    
    const itemId = itemData?.item?.id;
    
    if (itemId) {
      toast({
        title: "Banco conectado!",
        description: "Sincronizando seus dados financeiros...",
      });

      try {
        // Call sync function to fetch all data immediately
        const { data, error } = await supabase.functions.invoke("sync-bank-data", {
          body: { itemId },
        });

        if (error) {
          console.error("Sync error:", error);
          toast({
            title: "Aviso",
            description: "Banco conectado, mas houve um problema na sincronização inicial. Os dados serão sincronizados em breve.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sincronização concluída!",
            description: `${data?.synced?.accounts || 0} contas, ${data?.synced?.creditCards || 0} cartões, ${data?.synced?.investments || 0} investimentos sincronizados.`,
          });
        }
      } catch (e) {
        console.error("Sync call error:", e);
      }
    } else {
      toast({
        title: "Banco conectado!",
        description: "Suas transações serão sincronizadas automaticamente.",
      });
    }

    // Invalidate all finance queries to refresh data immediately
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
    queryClient.invalidateQueries({ queryKey: ["loans"] });
    queryClient.invalidateQueries({ queryKey: ["investments"] });
  };

  const handleError = (error: any) => {
    console.error("Pluggy connection error:", error);
    setConnectToken(null);
    
    toast({
      title: "Erro na conexão",
      description: error?.message || "Houve um problema ao conectar sua conta bancária",
      variant: "destructive",
    });
  };

  const handleClose = () => {
    setConnectToken(null);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleConnect}
          disabled={isLoading}
          variant="outline"
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Landmark className="h-4 w-4" />
          )}
          Conectar Banco
        </Button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
          <span className="hidden sm:inline">Segurança Criptografada</span>
        </div>
      </div>

      <Dialog open={!!connectToken} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] h-[90vh] sm:h-[80vh] min-h-[600px] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Conectar Conta Bancária</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-full overflow-y-auto [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!min-h-[550px]">
            {connectToken && (
              <PluggyConnect
                connectToken={connectToken}
                onSuccess={handleSuccess}
                onError={handleError}
                onClose={handleClose}
                includeSandbox={true}
                language="pt"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
