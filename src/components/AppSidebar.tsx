import { useState } from "react";
import { 
  Home, 
  CreditCard, 
  Landmark, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Sparkles,
  Sun,
  Moon,
  User,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ConnectBankButton } from "./ConnectBankButton";
import { BankAccountsList } from "./BankAccountsList";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { SyncLogsModal } from "./SyncLogsModal";
import { useTheme } from "next-themes";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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
  const [profileOpen, setProfileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">M</span>
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
        
        {/* Edit Profile */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogTrigger asChild>
            <SidebarMenuButton tooltip="Editar Perfil" className="w-full">
              <User className="h-4 w-4" />
              {!collapsed && <span>Editar Perfil</span>}
            </SidebarMenuButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
              <DialogDescription>
                Atualize suas informações pessoais
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" placeholder="Seu nome" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ""} disabled />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>
              <Button className="w-full">Salvar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>

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
                Gerencie suas preferências e conexões
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {/* Theme Toggle */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Tema</h3>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    {isDark ? (
                      <Moon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Sun className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">Modo {isDark ? "Escuro" : "Claro"}</p>
                      <p className="text-xs text-muted-foreground">
                        Alternar aparência do aplicativo
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isDark}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
              </div>

              {/* Bank Connections */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Desconectar Bancos</h3>
                <BankAccountsList />
              </div>

              {/* Sync Logs */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Diagnóstico</h3>
                <SyncLogsModal />
              </div>
              
              {/* Danger Zone */}
              <div className="pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-medium text-destructive">
                    Zona de Perigo
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Ações irreversíveis que afetam permanentemente sua conta
                </p>
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
