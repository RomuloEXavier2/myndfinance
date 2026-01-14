import { useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import { Button } from "@/components/ui/button";
import { Landmark, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

  const handleSuccess = (itemData: any) => {
    console.log("Bank connected successfully:", itemData);
    setConnectToken(null);
    
    toast({
      title: "Banco conectado!",
      description: "Suas transações serão sincronizadas automaticamente.",
    });

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
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
    </>
  );
}
