import { Home, CreditCard, Landmark, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", title: "Home", icon: Home },
  { id: "investments", title: "Invest", icon: TrendingUp },
  { id: "loans", title: "Crédito", icon: Landmark },
  { id: "cards", title: "Cartões", icon: CreditCard },
  { id: "insights", title: "IA", icon: Sparkles },
];

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1",
              activeTab === item.id
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-medium truncate">{item.title}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
