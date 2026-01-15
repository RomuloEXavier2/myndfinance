import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountButton() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== "EXCLUIR") {
      toast({
        title: "Confirmação inválida",
        description: "Digite EXCLUIR para confirmar",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user-account", {
        body: { confirmation: "DELETE_MY_ACCOUNT" },
      });

      if (error) throw error;

      toast({
        title: "Conta excluída",
        description: "Todos os seus dados foram removidos permanentemente.",
      });

      // Sign out and redirect
      await signOut();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir conta",
        description: error.message || "Não foi possível excluir sua conta",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDialog(false);
      setConfirmText("");
    }
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Excluir minha conta e dados
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Conta Permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="font-semibold text-foreground">
              Esta ação é irreversível. Todos os seus dados financeiros e conexões bancárias serão apagados permanentemente.
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Todas as transações</li>
              <li>Contas bancárias conectadas</li>
              <li>Cartões de crédito</li>
              <li>Empréstimos</li>
              <li>Investimentos</li>
              <li>Sua conta de usuário</li>
            </ul>
            <div className="pt-4">
              <Label htmlFor="confirm" className="text-foreground">
                Digite <strong>EXCLUIR</strong> para confirmar:
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="mt-2"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={confirmText !== "EXCLUIR" || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              "Excluir Permanentemente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
