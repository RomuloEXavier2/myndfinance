import { useState } from "react";
import { 
  Home, 
  CreditCard, 
  Landmark, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Building2,
  Sparkles,
  Menu
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ConnectBankButton } from "./ConnectBankButton";
import { BankAccountsList } from "./BankAccountsList";
import { DeleteAccountButton } from "./DeleteAccountButton";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "dashboard", title: "Dashboard", icon: Home },
  { id: "investments", title: "Investimentos", icon: TrendingUp },
  { id: "loans", title: "Crédito & Dívidas", icon: Landmark },
  { id: "cards", title: "Cartões", icon: CreditCard },
  { id: "insights", title: "Insights IA", icon: Sparkles },
];

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Menu className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-sidebar-foreground">MYND CFO</h1>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    isActive={activeTab === item.id}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conexões</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2">
              <ConnectBankButton />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <Separator className="mb-2" />
        
        {/* Settings */}
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetTrigger asChild>
            <SidebarMenuButton tooltip="Configurações" className="w-full">
              <Settings className="h-4 w-4" />
              {!collapsed && <span>Configurações</span>}
            </SidebarMenuButton>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Configurações</SheetTitle>
              <SheetDescription>
                Gerencie suas conexões bancárias e conta
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <BankAccountsList />
              
              <div className="pt-6 border-t">
                <h3 className="text-sm font-medium text-destructive mb-4">
                  Zona de Perigo
                </h3>
                <DeleteAccountButton />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logout */}
        <SidebarMenuButton 
          onClick={signOut} 
          tooltip="Sair"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
