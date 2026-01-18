import { useState } from "react";
import { FileText, RefreshCw, Trash2, ChevronDown, ChevronUp, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useDebugLogs, DebugLog } from "@/hooks/useDebugLogs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function getLevelIcon(level: string) {
  switch (level) {
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "warn":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function getLevelBadge(level: string) {
  switch (level) {
    case "error":
      return <Badge variant="destructive">Erro</Badge>;
    case "warn":
      return <Badge className="bg-yellow-500">Aviso</Badge>;
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
}

function LogEntry({ log }: { log: DebugLog }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border p-3 mb-2",
          log.level === "error" && "border-destructive/50 bg-destructive/5",
          log.level === "warn" && "border-yellow-500/50 bg-yellow-500/5",
          log.level === "info" && "border-border"
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex items-start justify-between w-full text-left gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {getLevelIcon(log.level)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {log.stage}
                  </span>
                  {getLevelBadge(log.level)}
                </div>
                <p className="text-sm mt-1 truncate">{log.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
            </div>
            {log.details && (
              <div className="shrink-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )}
          </button>
        </CollapsibleTrigger>
        
        {log.details && (
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Detalhes:</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export function SyncLogsModal() {
  const { logs, isLoading, refetch, clearLogs, isClearing } = useDebugLogs();
  const [open, setOpen] = useState(false);

  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
          <FileText className="h-4 w-4" />
          <span>Log de Sincronização</span>
          {errorCount > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {errorCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log de Sincronização
          </DialogTitle>
          <DialogDescription>
            Veja os logs detalhados das sincronizações com seu banco
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearLogs()}
            disabled={isClearing || logs.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Logs
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {logs.length} registro(s)
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum log de sincronização</p>
              <p className="text-xs text-muted-foreground mt-1">
                Conecte um banco para ver os logs aqui
              </p>
            </div>
          ) : (
            <div className="pr-4">
              {logs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
