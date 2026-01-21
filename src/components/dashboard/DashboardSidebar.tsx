import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  Bot,
  TrendingUp,
  MapPin,
  Database,
  Monitor,
  LogOut,
  Menu,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Settings,
  Smartphone,
  Home,
  Route,
  Network,
  MessageSquare,
  ShoppingCart,
  Gauge,
  Brain,
  Heart
} from "lucide-react";

export type DashboardTabType =
  | "indicators"
  | "api"
  | "ai"
  | "data-analysis"
  | "analytics-uf"
  | "chart-database"
  | "table-database"
  | "dataflow-architecture"
  | "dataflow-talk-app"
  | "dataflow-retail-system"
  | "dataflow-autocontrol"
  | "dataflow-tutor"
  | "dataflow-healthcare";

interface DashboardSidebarProps {
  activeTab: DashboardTabType;
  onTabChange: (tab: DashboardTabType) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems: { id: DashboardTabType; label: string; icon: React.ElementType }[] = [
  { id: "indicators", label: "Indicadores de Uso", icon: BarChart3 },
  { id: "api", label: "API", icon: Monitor },
  { id: "ai", label: "IA", icon: Bot },
  { id: "data-analysis", label: "Data Analysis", icon: TrendingUp },
  { id: "analytics-uf", label: "UF DataSet", icon: MapPin },
  { id: "chart-database", label: "Chart DataSet", icon: Database },
  { id: "table-database", label: "Table DataSet", icon: Database },
];

const dataFlowItems: { id: DashboardTabType; label: string; icon: React.ElementType }[] = [
  { id: "dataflow-architecture", label: "Architecture", icon: Network },
  { id: "dataflow-retail-system", label: "Retail System", icon: ShoppingCart },
  { id: "dataflow-autocontrol", label: "AutoControl", icon: Gauge },
  { id: "dataflow-tutor", label: "Tutor", icon: Brain },
  { id: "dataflow-healthcare", label: "HealthCare", icon: Heart },
  { id: "dataflow-talk-app", label: "Talk APP", icon: MessageSquare },
];

export function DashboardSidebar({ 
  activeTab, 
  onTabChange, 
  onLogout,
  isCollapsed,
  onToggleCollapse
}: DashboardSidebarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isControlCenterCollapsed, setIsControlCenterCollapsed] = useState(false);
  const [isDataFlowExpanded, setIsDataFlowExpanded] = useState(() => activeTab.startsWith("dataflow-"));
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Check if user is superadmin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .maybeSingle();

      setIsSuperAdmin(!!roleData);
    };

    checkSuperAdmin();
  }, []);

  // Check scroll position
  const handleNavScroll = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    
    const { scrollTop, scrollHeight, clientHeight } = nav;
    setCanScrollUp(scrollTop > 10);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
  }, []);

  // Filter menu items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const query = searchQuery.toLowerCase();
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Filter dataflow items based on search query
  const filteredDataFlowItems = useMemo(() => {
    if (!searchQuery.trim()) return dataFlowItems;
    const query = searchQuery.toLowerCase();
    return dataFlowItems.filter(item => 
      item.label.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // No auto-expand effect - let user control collapse/expand manually
  // Initial state is set based on activeTab in useState initialization

  // Resize observer for scroll indicators
  useEffect(() => {
    handleNavScroll();
    const nav = navRef.current;
    if (!nav) return;

    const resizeObserver = new ResizeObserver(handleNavScroll);
    resizeObserver.observe(nav);
    
    return () => resizeObserver.disconnect();
  }, [handleNavScroll, filteredItems]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={`
          ${isCollapsed ? 'w-[72px]' : 'w-[256px]'} 
          bg-sidebar border-r border-border 
          fixed left-0 top-0 h-screen z-50 
          flex flex-col overflow-hidden 
          transition-all duration-500 ease-in-out
        `}
      >
        {/* TOP HEADER: Hamburger + Search */}
        <div className={`
          border-b border-border shrink-0
          flex transition-all duration-500 ease-in-out
          ${isCollapsed 
            ? 'flex-col items-center w-full gap-4 px-3 py-4' 
            : 'flex-row items-center w-full gap-3 px-4 py-3'}
        `}>
          {/* Hamburger Menu with Rotation Animation */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="group shrink-0 h-10 w-10 rounded-full hover:bg-[#00D4FF]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] transition-all duration-300"
          >
            <div className="relative w-5 h-5">
              <Menu className={`w-5 h-5 absolute inset-0 transition-all duration-300 group-hover:text-[#00D4FF] ${isCollapsed ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
              <X className={`w-5 h-5 absolute inset-0 transition-all duration-300 group-hover:text-[#00D4FF] ${isCollapsed ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
            </div>
          </Button>

          {/* Search Component */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="group h-10 w-10 rounded-full hover:bg-[#00D4FF]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] transition-all duration-500 ease-in-out animate-pulse"
                  onClick={() => {
                    onToggleCollapse();
                    setTimeout(() => {
                      const searchInput = document.querySelector('input[placeholder="Buscar..."]') as HTMLInputElement;
                      searchInput?.focus();
                    }, 350);
                  }}
                >
                  <Search className="w-4 h-4 group-hover:text-[#00D4FF] transition-colors duration-300" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Buscar</TooltipContent>
            </Tooltip>
          ) : (
            <div className="relative flex-1 transition-all duration-500 ease-in-out">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm bg-muted/30 border-border rounded-full focus:border-primary/50 w-full"
              />
            </div>
          )}
        </div>

        {/* Top fade indicator */}
        <div 
          className={`absolute top-[100px] left-0 right-0 h-6 bg-gradient-to-b from-sidebar to-transparent z-10 pointer-events-none transition-opacity duration-200 ${canScrollUp ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* MIDDLE NAVIGATION - Scrollable */}
        <nav 
          ref={navRef}
          onScroll={handleNavScroll}
          className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'} py-4 pb-48 space-y-1`}
        >
        {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return isCollapsed ? (
              <div key={item.id} className="flex justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "group w-full h-12 rounded-lg transition-all duration-300 ease-in-out",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105"
                      )}
                      onClick={() => onTabChange(item.id)}
                    >
                      <Icon className={cn("w-5 h-5", !isActive && "group-hover:text-black")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "group w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all duration-300 ease-in-out",
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 text-muted-foreground hover:text-black"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className={cn("h-5 w-5 shrink-0", !isActive && "group-hover:text-black")} />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}

          {/* DataFlow Expandable Section */}
          {(filteredDataFlowItems.length > 0 || !searchQuery.trim()) && (
            <div className="mt-1">
              {isCollapsed ? (
                <div className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "group w-full h-12 rounded-lg transition-all duration-300 ease-in-out",
                          activeTab.startsWith("dataflow-")
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105"
                        )}
                        onClick={() => {
                          onToggleCollapse();
                          setIsDataFlowExpanded(true);
                        }}
                      >
                        <Route className={cn("w-5 h-5", !activeTab.startsWith("dataflow-") && "group-hover:text-black")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      DataFlow
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <>
                  {/* DataFlow Header */}
                  <Button
                    variant="ghost"
                    className={cn(
                      "group w-full justify-between gap-3 h-11 px-3 rounded-lg transition-all duration-300 ease-in-out",
                      activeTab.startsWith("dataflow-")
                        ? "bg-primary/20 text-primary"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setIsDataFlowExpanded(!isDataFlowExpanded)}
                  >
                    <div className="flex items-center gap-3">
                      <Route className="h-5 w-5 shrink-0" />
                      <span className="truncate font-medium">DataFlow</span>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      isDataFlowExpanded && "rotate-90"
                    )} />
                  </Button>

                  {/* DataFlow Sub-items */}
                  {isDataFlowExpanded && (
                    <div className="mt-1 ml-3 pl-3 border-l border-border/50 space-y-1">
                      {filteredDataFlowItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        
                        return (
                          <Button
                            key={item.id}
                            variant="ghost"
                            className={cn(
                              "group w-full justify-start gap-3 h-10 px-3 rounded-lg transition-all duration-300 ease-in-out text-sm",
                              isActive
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] text-muted-foreground hover:text-black"
                            )}
                            onClick={() => onTabChange(item.id)}
                          >
                            <Icon className={cn("h-4 w-4 shrink-0", !isActive && "group-hover:text-black")} />
                            <span className="truncate">{item.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </nav>

        {/* Bottom fade indicator */}
        <div 
          className={`absolute bottom-[200px] left-0 right-0 h-6 bg-gradient-to-t from-sidebar to-transparent z-10 pointer-events-none transition-opacity duration-200 ${canScrollDown ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* BOTTOM DOCK - Control Center */}
        <div className="absolute bottom-0 left-0 w-full z-50 bg-[#0B1120] border-t border-white/10 p-2 transition-all duration-200">
          {/* Chevron Toggle - Only visible when sidebar is expanded */}
          {!isCollapsed && (
            <button
              onClick={() => setIsControlCenterCollapsed(!isControlCenterCollapsed)}
              className="group absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-background border border-border rounded-full p-0.5 hover:bg-muted transition-all duration-200"
            >
              {isControlCenterCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
              )}
            </button>
          )}

          {isCollapsed ? (
            // SCENARIO A: Sidebar COLLAPSED - Vertical icons only
            <div className="flex flex-col items-center gap-1">
              {/* Admin link - superadmin only */}
              {isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="group h-10 w-10 rounded-lg hover:bg-muted transition-all duration-200"
                      onClick={() => navigate("/admin")}
                    >
                      <Settings className="w-4 h-4 group-hover:text-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Admin</TooltipContent>
                </Tooltip>
              )}

              {/* App link */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-10 w-10 rounded-lg hover:bg-muted transition-all duration-200"
                    onClick={() => navigate("/app")}
                  >
                    <Smartphone className="w-4 h-4 group-hover:text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">App</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-10 w-10 rounded-lg text-primary hover:bg-muted transition-all duration-200"
                    onClick={() => navigate("/")}
                  >
                    <Home className="w-4 h-4 group-hover:text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Voltar ao Início</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-10 w-10 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-200"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </div>
          ) : isControlCenterCollapsed ? (
            // SCENARIO B-2: Sidebar EXPANDED + Control Center COLLAPSED - Horizontal row
            <div className="flex flex-row items-center justify-around py-1">
              {isSuperAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="group h-9 w-9 rounded-lg hover:bg-muted transition-all duration-200"
                      onClick={() => navigate("/admin")}
                    >
                      <Settings className="w-4 h-4 group-hover:text-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Admin</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-9 w-9 rounded-lg hover:bg-muted transition-all duration-200"
                    onClick={() => navigate("/app")}
                  >
                    <Smartphone className="w-4 h-4 group-hover:text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">App</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-9 w-9 rounded-lg text-primary hover:bg-muted transition-all duration-200"
                    onClick={() => navigate("/")}
                  >
                    <Home className="w-4 h-4 group-hover:text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Voltar ao Início</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-200"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Sair</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            // SCENARIO B-1: Sidebar EXPANDED + Control Center EXPANDED - Vertical with text
            <div className="flex flex-col gap-0.5">
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  className="group w-full justify-start gap-3 h-9 rounded-lg hover:bg-muted transition-all duration-200"
                  onClick={() => navigate("/admin")}
                >
                  <Settings className="w-4 h-4 shrink-0 group-hover:text-foreground" />
                  <span className="whitespace-nowrap">Admin</span>
                </Button>
              )}

              <Button 
                variant="ghost" 
                className="group w-full justify-start gap-3 h-9 rounded-lg hover:bg-muted transition-all duration-200"
                onClick={() => navigate("/app")}
              >
                <Smartphone className="w-4 h-4 shrink-0 group-hover:text-foreground" />
                <span className="whitespace-nowrap">App</span>
              </Button>

              <Button 
                variant="ghost" 
                className="group w-full justify-start gap-3 h-9 rounded-lg text-primary hover:bg-muted transition-all duration-200"
                onClick={() => navigate("/")}
              >
                <Home className="w-4 h-4 shrink-0 group-hover:text-foreground" />
                <span className="whitespace-nowrap">Voltar ao Início</span>
              </Button>

              <Button 
                variant="ghost" 
                className="group w-full justify-start gap-3 h-9 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-200"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Sair</span>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
