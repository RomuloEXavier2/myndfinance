import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { SummaryCards } from "./SummaryCards";
import { ChartCarousel } from "./ChartCarousel";
import { TransactionsList } from "./TransactionsList";
import { VoiceRecorder } from "./VoiceRecorder";
import { AddTransactionForm } from "./AddTransactionForm";
import { ConnectBankButton } from "./ConnectBankButton";
import { Button } from "@/components/ui/button";
import { LogOut, Mic } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const { user, signOut } = useAuth();
  const {
    transactions,
    totals,
    chartData,
    isLoading,
    processVoice,
    isProcessing,
    addTransaction,
    isAdding,
    deleteTransaction,
  } = useTransactions();
  
  const [lastTranscription, setLastTranscription] = useState<string>("");
  
  const handleVoiceComplete = async (audioBase64: string) => {
    try {
      const result = await processVoice(audioBase64);
      if (result?.transcription) {
        setLastTranscription(result.transcription);
      }
    } catch (error: any) {
      // Capture transcription from error if available
      if (error?.transcription) {
        setLastTranscription(error.transcription);
      }
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Mic className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">MYND CFO</h1>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectBankButton />
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-10 w-10 rounded-full"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <SummaryCards totals={totals} />

        {/* Chart Carousel */}
        <ChartCarousel chartData={chartData} transactions={transactions} />

        {/* Transactions List */}
        <TransactionsList
          transactions={transactions}
          onDelete={deleteTransaction}
        />

        {/* Voice Instructions */}
        <div className="fade-in rounded-xl border border-border bg-card/50 p-6 text-center" style={{ animationDelay: "600ms" }}>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Como usar o assistente por voz
          </h3>
          <p className="text-muted-foreground">
            Clique no botão do microfone e diga:
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <span className="rounded-full bg-income/10 px-4 py-2 text-sm text-income">
              "Recebi 5000 de salário"
            </span>
            <span className="rounded-full bg-expense/10 px-4 py-2 text-sm text-expense">
              "Gastei 150 no mercado"
            </span>
            <span className="rounded-full bg-reserve/10 px-4 py-2 text-sm text-reserve">
              "Guardei 500 reais"
            </span>
          </div>
        </div>
      </main>

      {/* Manual Add FAB */}
      <AddTransactionForm onAdd={addTransaction} isAdding={isAdding} />

      {/* Voice Recorder FAB with Debug Label */}
      <VoiceRecorder
        onRecordingComplete={handleVoiceComplete}
        isProcessing={isProcessing}
        lastTranscription={lastTranscription}
      />
    </div>
  );
}
