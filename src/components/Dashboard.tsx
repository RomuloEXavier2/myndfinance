import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { SummaryCards } from "./SummaryCards";
import { ChartCarousel } from "./ChartCarousel";
import { TransactionsList } from "./TransactionsList";
import { VoiceRecorder } from "./VoiceRecorder";
import { AddTransactionForm } from "./AddTransactionForm";
import { FinanceOverview } from "./FinanceOverview";
import { InvestmentsModule } from "./InvestmentsModule";
import { LoansModule } from "./LoansModule";
import { CardsModule } from "./CardsModule";
import { InsightsModule } from "./InsightsModule";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Mic } from "lucide-react";

export function Dashboard() {
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
  
  const { totalBalance } = useBankAccounts();
  
  const [lastTranscription, setLastTranscription] = useState<string>("");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const handleVoiceComplete = async (audioBase64: string) => {
    try {
      const result = await processVoice(audioBase64);
      if (result?.transcription) {
        setLastTranscription(result.transcription);
      }
    } catch (error: any) {
      if (error?.transcription) {
        setLastTranscription(error.transcription);
      }
      throw error;
    }
  };

  // Combine bank balance with calculated totals
  const enhancedTotals = {
    ...totals,
    saldoReal: totalBalance,
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

  const renderContent = () => {
    switch (activeTab) {
      case "investments":
        return <InvestmentsModule />;
      case "loans":
        return <LoansModule />;
      case "cards":
        return <CardsModule />;
      case "insights":
        return <InsightsModule />;
      default:
        return (
          <>
            {/* Summary Cards - now showing real balance */}
            <SummaryCards totals={enhancedTotals} bankBalance={totalBalance} />

            {/* Open Finance Overview */}
            <FinanceOverview />

            {/* Chart Carousel */}
            <ChartCarousel chartData={chartData} transactions={transactions} />

            {/* Transactions List */}
            <TransactionsList
              transactions={transactions}
              onDelete={deleteTransaction}
            />

            {/* Voice Instructions */}
            <div className="fade-in rounded-xl border border-border bg-card/50 p-4 sm:p-6 text-center" style={{ animationDelay: "600ms" }}>
              <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground">
                Como usar o assistente por voz
              </h3>
              <p className="text-sm text-muted-foreground">
                Clique no botão do microfone e diga:
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-3">
                <span className="rounded-full bg-income/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-income">
                  "Recebi 5000 de salário"
                </span>
                <span className="rounded-full bg-expense/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-expense">
                  "Gastei 150 no mercado"
                </span>
                <span className="rounded-full bg-reserve/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-reserve">
                  "Guardei 500 reais"
                </span>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                  <Mic className="h-4 w-4 text-primary-foreground" />
                </div>
                <h1 className="text-lg font-bold text-foreground">MYND CFO</h1>
              </div>
            </div>
          </header>

          {/* Desktop Header with Sidebar Trigger */}
          <header className="hidden md:flex items-center border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Mic className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold text-foreground">MYND CFO</h1>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6 px-4 py-4 sm:py-6">
              {/* Page Title */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground capitalize">
                  {activeTab === "dashboard" ? "Visão Geral" : 
                   activeTab === "investments" ? "Investimentos" :
                   activeTab === "loans" ? "Crédito & Dívidas" :
                   activeTab === "cards" ? "Cartões" : "Insights IA"}
                </h2>
              </div>

              {renderContent()}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* FABs - only on dashboard */}
      {activeTab === "dashboard" && (
        <>
          <AddTransactionForm onAdd={addTransaction} isAdding={isAdding} />
          <VoiceRecorder
            onRecordingComplete={handleVoiceComplete}
            isProcessing={isProcessing}
            lastTranscription={lastTranscription}
          />
        </>
      )}
    </SidebarProvider>
  );
}
