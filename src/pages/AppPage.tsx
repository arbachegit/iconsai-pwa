import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Home, 
  MessageSquare, 
  Database, 
  BarChart3, 
  LogOut,
  Bot,
  Menu,
  X,
  Search,
  Settings,
  Shield,
  LayoutDashboard,
  ChevronUp,
  ChevronDown,
  Home as HomeIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AgentChat } from "@/components/chat/AgentChat";
import { UserBadge } from "@/components/UserBadge";
import { useAuth } from "@/hooks/useAuth";
import knowyouLogo from "@/assets/knowyou-admin-logo.png";

type AppView = "home" | "chat" | "data" | "analytics" | "settings";

export default function AppPage() {
  const navigate = useNavigate();
  const { role, signOut, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isControlCenterCollapsed, setIsControlCenterCollapsed] = useState(false);

  const menuItems = [
    { id: "home" as AppView, label: "Início", icon: Home },
    { id: "chat" as AppView, label: "Assistente KnowYOU", icon: MessageSquare },
    { id: "data" as AppView, label: "Dados", icon: Database },
    { id: "analytics" as AppView, label: "Analytics", icon: BarChart3 },
    { id: "settings" as AppView, label: "Configurações", icon: Settings },
  ];

  const filteredMenuItems = searchQuery.trim()
    ? menuItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : menuItems;

  const renderContent = () => {
    switch (currentView) {
      case "home":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Bem-vindo ao KnowYOU App</h1>
            <p className="text-muted-foreground text-center max-w-md">
              Sua plataforma de análise de dados e inteligência artificial. 
              Use o assistente para analisar seus dados.
            </p>
            <Button onClick={() => setCurrentView("chat")} size="lg">
              <MessageSquare className="mr-2 h-5 w-5" />
              Iniciar Chat
            </Button>
          </div>
        );
      case "chat":
        return <AgentChat agentSlug="analyst_user" embedded />;
      case "data":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <Database className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Área de Dados</h2>
            <p className="text-muted-foreground text-center">
              Upload e gestão de datasets em breve.
            </p>
          </div>
        );
      case "analytics":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <BarChart3 className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Analytics</h2>
            <p className="text-muted-foreground text-center">
              Relatórios e dashboards em breve.
            </p>
          </div>
        );
      case "settings":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <Settings className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Configurações</h2>
            <p className="text-muted-foreground text-center">
              Configurações do usuário em breve.
            </p>
          </div>
        );
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-screen flex bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            "h-full bg-sidebar border-r border-border flex flex-col transition-all duration-300",
            sidebarCollapsed ? "w-[72px]" : "w-64"
          )}
        >
          {/* Header: Hamburger + Logo + Search */}
          <div className={cn(
            "border-b border-border shrink-0 flex transition-all duration-300",
            sidebarCollapsed 
              ? "flex-col items-center gap-3 px-3 py-4" 
              : "flex-row items-center gap-3 px-4 py-3"
          )}>
            {/* Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="group shrink-0 h-10 w-10 rounded-full hover:bg-primary/10 transition-all duration-300"
            >
              <div className="relative w-5 h-5">
                <Menu className={cn(
                  "w-5 h-5 absolute inset-0 transition-all duration-300 group-hover:text-primary",
                  sidebarCollapsed ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                )} />
                <X className={cn(
                  "w-5 h-5 absolute inset-0 transition-all duration-300 group-hover:text-primary",
                  sidebarCollapsed ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                )} />
              </div>
            </Button>


            {/* Search */}
            {sidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-primary/10"
                    onClick={() => {
                      setSidebarCollapsed(false);
                      setTimeout(() => {
                        const input = document.querySelector('input[placeholder="Buscar..."]') as HTMLInputElement;
                        input?.focus();
                      }, 300);
                    }}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Buscar</TooltipContent>
              </Tooltip>
            ) : (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm bg-muted/30 border-border rounded-full"
                />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return sidebarCollapsed ? (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="icon"
                      className={cn(
                        "w-full h-12 rounded-lg transition-all duration-300",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-primary/10"
                      )}
                      onClick={() => setCurrentView(item.id)}
                    >
                      <Icon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11 rounded-lg transition-all duration-300",
                    isActive 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "hover:bg-primary/10"
                  )}
                  onClick={() => setCurrentView(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* Footer Dock - Control Center */}
          <div className="border-t border-border p-2 relative">
            {/* Chevron Toggle - Only visible when sidebar is expanded */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setIsControlCenterCollapsed(!isControlCenterCollapsed)}
                className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-sidebar border border-border flex items-center justify-center hover:bg-[#00D4FF] hover:border-[#00D4FF] hover:shadow-[0_0_10px_rgba(0,212,255,0.5)] transition-all duration-300 group"
              >
                {isControlCenterCollapsed ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-black transition-colors" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-black transition-colors" />
                )}
              </button>
            )}

            {/* Scenario A: Sidebar COLLAPSED - Vertical icons with tooltips */}
            {sidebarCollapsed ? (
              <div className="flex flex-col gap-1">
                {/* Admin - superadmin only */}
                {isLoading ? (
                  <div className="w-full h-10 rounded-lg bg-muted/20 animate-pulse" />
                ) : role === "superadmin" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="group w-full h-10 rounded-lg text-purple-400 hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                        onClick={() => navigate("/admin")}
                      >
                        <Shield className="h-5 w-5 group-hover:text-black" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Admin</TooltipContent>
                  </Tooltip>
                ) : null}

                {/* Dashboard */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="group w-full h-10 rounded-lg text-muted-foreground hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                      onClick={() => navigate("/dashboard")}
                    >
                      <LayoutDashboard className="h-5 w-5 group-hover:text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Dashboard</TooltipContent>
                </Tooltip>

                {/* Voltar ao Início */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="group w-full h-10 rounded-lg text-primary hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                      onClick={() => navigate("/")}
                    >
                      <HomeIcon className="h-5 w-5 group-hover:text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Voltar ao Início</TooltipContent>
                </Tooltip>

                {/* Sair */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="group w-full h-10 rounded-lg text-destructive hover:bg-[#FF3366] hover:text-white hover:shadow-[0_0_15px_rgba(255,51,102,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                      onClick={signOut}
                    >
                      <LogOut className="h-5 w-5 group-hover:text-white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sair</TooltipContent>
                </Tooltip>
              </div>
            ) : isControlCenterCollapsed ? (
              /* Scenario B-2: Sidebar EXPANDED + Control Center COLLAPSED - Horizontal icons */
              <div className={cn(
                "flex flex-row items-center justify-around py-1 transition-all duration-300 ease-in-out overflow-hidden",
                "max-h-14 opacity-100"
              )}>
                {/* Admin - superadmin only */}
                {isLoading ? (
                  <div className="h-10 w-10 rounded-lg bg-muted/20 animate-pulse" />
                ) : role === "superadmin" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="group h-10 w-10 rounded-lg text-purple-400 hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                        onClick={() => navigate("/admin")}
                      >
                        <Shield className="h-5 w-5 group-hover:text-black" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Admin</TooltipContent>
                  </Tooltip>
                ) : null}

                {/* Dashboard */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="group h-10 w-10 rounded-lg text-muted-foreground hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                      onClick={() => navigate("/dashboard")}
                    >
                      <LayoutDashboard className="h-5 w-5 group-hover:text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Dashboard</TooltipContent>
                </Tooltip>

                {/* Voltar ao Início */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="group h-10 w-10 rounded-lg text-primary hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                      onClick={() => navigate("/")}
                    >
                      <HomeIcon className="h-5 w-5 group-hover:text-black" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Voltar ao Início</TooltipContent>
                </Tooltip>

                {/* Sair */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="group h-10 w-10 rounded-lg text-destructive hover:bg-[#FF3366] hover:text-white hover:shadow-[0_0_15px_rgba(255,51,102,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                      onClick={signOut}
                    >
                      <LogOut className="h-5 w-5 group-hover:text-white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Sair</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              /* Scenario B-1: Sidebar EXPANDED + Control Center EXPANDED - Vertical with text */
              <div className={cn(
                "flex flex-col gap-0.5 transition-all duration-300 ease-in-out overflow-hidden",
                "max-h-48 opacity-100"
              )}>
                {/* Admin - superadmin only */}
                {isLoading ? (
                  <div className="w-full h-10 rounded-lg bg-muted/20 animate-pulse" />
                ) : role === "superadmin" ? (
                  <Button
                    variant="ghost"
                    className="group w-full justify-start gap-3 h-10 rounded-lg text-purple-400 hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                    onClick={() => navigate("/admin")}
                  >
                    <Shield className="h-5 w-5 group-hover:text-black" />
                    <span className="group-hover:text-black">Admin</span>
                  </Button>
                ) : null}

                {/* Dashboard */}
                <Button
                  variant="ghost"
                  className="group w-full justify-start gap-3 h-10 rounded-lg text-muted-foreground hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                  onClick={() => navigate("/dashboard")}
                >
                  <LayoutDashboard className="h-5 w-5 group-hover:text-black" />
                  <span className="group-hover:text-black">Dashboard</span>
                </Button>

                {/* Voltar ao Início */}
                <Button
                  variant="ghost"
                  className="group w-full justify-start gap-3 h-10 rounded-lg text-primary hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                  onClick={() => navigate("/")}
                >
                  <HomeIcon className="h-5 w-5 group-hover:text-black" />
                  <span className="group-hover:text-black">Voltar ao Início</span>
                </Button>

                {/* Sair */}
                <Button
                  variant="ghost"
                  className="group w-full justify-start gap-3 h-10 rounded-lg text-destructive hover:bg-[#FF3366] hover:text-white hover:shadow-[0_0_15px_rgba(255,51,102,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                  onClick={signOut}
                >
                  <LogOut className="h-5 w-5 group-hover:text-white" />
                  <span className="group-hover:text-white">Sair</span>
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <img src={knowyouLogo} alt="KnowYOU" className="h-7" />
              <h1 className="font-semibold text-foreground">
                {menuItems.find((m) => m.id === currentView)?.label || "KnowYOU App"}
              </h1>
            </div>
            <UserBadge />
          </header>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
