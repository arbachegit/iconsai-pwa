import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { supabaseUntyped } from "@/integrations/supabase/typed-client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import knowyouAdminLogo from "@/assets/knowyou-admin-logo.png";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Mail,
  BarChart3,
  LogOut,
  MessagesSquare,
  Image,
  Video,
  BookOpen,
  Database,
  GitBranch,
  Tags,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  MessageCircle,
  Brain,
  Film,
  Settings,
  Route,
  TestTube,
  Music,
  ClipboardCheck,
  ShieldCheck,
  Shield,
  History,
  Users,
  Target,
  Globe,
  Sparkles,
  Menu,
  X,
  Monitor,
  RefreshCw,
  Bell,
  ScrollText,
  TrendingUp,
  Newspaper,
  Webhook,
  FileJson,
  MapPin,
  Bot,
  Smartphone,
  Home,
  DollarSign,
  TreeDeciduous,
  Volume2,
  Network,
  Layers,
  Star,
  GripVertical,
  ArrowRightLeft,
} from "lucide-react";
import { NotificationBell } from './NotificationBell';


type TabType = string;

interface AdminSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// Função para tocar som de notificação
const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
  oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.1); // C6
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

// Sortable Favorite Item Component for drag-and-drop
interface SortableFavoriteItemProps {
  id: string;
  item: { id: TabType; label: string; icon: any };
  isActive: boolean;
  pendingMessagesCount: number;
  unreadNotificationsCount: number;
  onTabChange: (tab: TabType) => void;
  onRemove: (id: string) => void;
  navigate: (path: string) => void;
}

function SortableFavoriteItem({ 
  id, 
  item, 
  isActive, 
  pendingMessagesCount, 
  unreadNotificationsCount, 
  onTabChange, 
  onRemove,
  navigate 
}: SortableFavoriteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const Icon = item.icon;
  const showContactBadge = item.id === "contact-messages" && pendingMessagesCount > 0;
  const showNotificationBadge = item.id === "notification-logs" && unreadNotificationsCount > 0;
  const badgeCount = showContactBadge ? pendingMessagesCount : (showNotificationBadge ? unreadNotificationsCount : 0);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-1 ${isDragging ? 'bg-muted/50 rounded-lg' : ''}`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="h-7 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      
      <Button
        variant={isActive ? "default" : "ghost"}
        className={`group flex-1 justify-start gap-3 h-9 rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted hover:text-foreground"} transition-all duration-200`}
        onClick={() => {
          if (item.id === "dashboard-external") {
            navigate("/dashboard");
          } else {
            onTabChange(item.id);
          }
        }}
      >
        <Icon className="w-4 h-4 shrink-0 group-hover:text-black" />
        <span className="truncate">{item.label}</span>
        {(showContactBadge || showNotificationBadge) && (
          <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
            {badgeCount}
          </Badge>
        )}
      </Button>
      
      {/* Remove from favorites */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-40 hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
      >
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      </Button>
    </div>
  );
}

export const AdminSidebar = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [openSections, setOpenSections] = useState<string[]>(["quick-access"]);
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const previousCountRef = useRef(0);
  const navRef = useRef<HTMLElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isControlCenterCollapsed, setIsControlCenterCollapsed] = useState(false);
  
  // Favorites state with localStorage + database persistence
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin-sidebar-favorites');
    return saved ? JSON.parse(saved) : ['dashboard'];
  });

  // DnD sensors for drag-and-drop reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save favorites to database
  const saveFavoritesToDb = useCallback(async (newFavorites: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            sidebar_favorites: newFavorites,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      }
    } catch (error) {
      console.error('[AdminSidebar] Error saving favorites to DB:', error);
    }
  }, []);

  // Load favorites from database on mount
  useEffect(() => {
    const loadFavoritesFromDb = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('user_preferences')
            .select('sidebar_favorites')
            .eq('user_id', user.id)
            .single();
          
          if (data?.sidebar_favorites && Array.isArray(data.sidebar_favorites)) {
            setFavorites(data.sidebar_favorites as string[]);
            localStorage.setItem('admin-sidebar-favorites', JSON.stringify(data.sidebar_favorites));
          }
        }
      } catch (error) {
        console.error('[AdminSidebar] Error loading favorites from DB:', error);
      }
    };
    loadFavoritesFromDb();
  }, []);

  // Handle drag end for reordering favorites
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFavorites((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        localStorage.setItem('admin-sidebar-favorites', JSON.stringify(newItems));
        saveFavoritesToDb(newItems);
        
        return newItems;
      });
    }
  }, [saveFavoritesToDb]);

  // Toggle favorite function
  const toggleFavorite = useCallback((tabId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(tabId)
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId];
      localStorage.setItem('admin-sidebar-favorites', JSON.stringify(newFavorites));
      saveFavoritesToDb(newFavorites);
      return newFavorites;
    });
  }, [saveFavoritesToDb]);

  // Check scroll position to show/hide fade indicators
  const handleNavScroll = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    
    const { scrollTop, scrollHeight, clientHeight } = nav;
    setCanScrollUp(scrollTop > 10);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
  }, []);


  const fetchPendingMessages = useCallback(async () => {
    const { count } = await supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    
    const newCount = count || 0;
    
    // Tocar som apenas se houver nova mensagem (count aumentou)
    if (newCount > previousCountRef.current && previousCountRef.current > 0) {
      playNotificationSound();
      toast.info("Nova mensagem de contato recebida!", {
        description: "Clique em 'Mensagens Contato' para visualizar.",
      });
    }
    
    previousCountRef.current = newCount;
    setPendingMessagesCount(newCount);
  }, []);

  // Fetch unread notifications count
  const fetchUnreadNotifications = useCallback(async () => {
    const { count } = await supabaseUntyped
      .from("notification_logs")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);

    setUnreadNotificationsCount(count || 0);
  }, []);

  useEffect(() => {
    fetchPendingMessages();

    // Subscrição realtime para novas mensagens
    const channel = supabase
      .channel('contact-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_messages'
        },
        () => {
          playNotificationSound();
          toast.info("Nova mensagem de contato recebida!", {
            description: "Clique em 'Mensagens Contato' para visualizar.",
          });
          fetchPendingMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contact_messages'
        },
        () => {
          fetchPendingMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingMessages]);

  // Fetch and subscribe to notifications
  useEffect(() => {
    fetchUnreadNotifications();
    
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_logs'
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadNotifications]);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin/login");
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Base menu categories (excluding quick-access which will be dynamic)
  const baseMenuCategories = useMemo(() => [
    {
      id: "chat",
      label: "Chat & Conversas",
      icon: MessageCircle,
      items: [
        { id: "conversations" as TabType, label: "Conversas", icon: MessagesSquare },
        { id: "pwa" as TabType, label: "Config. PWA", icon: Smartphone },
        { id: "pwa-conversations" as TabType, label: "Conversas PWA", icon: MessageSquare },
        { id: "maieutic-training" as TabType, label: "Treino IA Maiêutica", icon: Sparkles },
        { id: "maieutic-effectiveness" as TabType, label: "Eficácia Maiêutica", icon: Brain },
        { id: "regional-config" as TabType, label: "Configurações Regionais", icon: Globe },
        { id: "lexicon-phonetics" as TabType, label: "Fonética & TTS", icon: Volume2 },
        { id: "taxonomy-manager" as TabType, label: "Taxonomia Global", icon: TreeDeciduous },
        { id: "ontology-concepts" as TabType, label: "Ontologia Conceitos", icon: Network },
        { id: "deterministic-analysis" as TabType, label: "Fala Determinística", icon: Target },
        { id: "agent-management" as TabType, label: "Gestão de Agentes", icon: Bot },
      ]
    },
    {
      id: "rag",
      label: "RAG & Análise",
      icon: Brain,
      items: [
        { id: "documents" as TabType, label: "RAG Documentos", icon: FileText },
        { id: "rag-metrics" as TabType, label: "Métricas RAG", icon: Database },
        { id: "rag-diagnostics" as TabType, label: "Diagnóstico RAG", icon: TestTube },
        { id: "content-profiles" as TabType, label: "Perfis de Conteúdo", icon: Layers },
        { id: "taxonomy-suggestions" as TabType, label: "Auto-Gestão Taxonomia", icon: Sparkles },
        { id: "taxonomy-analytics" as TabType, label: "Analytics Taxonomia", icon: BarChart3 },
        { id: "tags" as TabType, label: "Gerenciar Tags", icon: Tags },
        { id: "document-analysis" as TabType, label: "Análise Documentos", icon: Search },
        { id: "doc-reclassification" as TabType, label: "Re-classificar Docs", icon: RefreshCw },
        { id: "document-onboarding" as TabType, label: "Onboarding Docs", icon: FileText },
        { id: "ml-review" as TabType, label: "Revisão ML", icon: Sparkles },
      ]
    },
    {
      id: "media",
      label: "Mídia & Conteúdo",
      icon: Film,
      items: [
        { id: "content-management" as TabType, label: "Seções Landing Page", icon: FileText },
        { id: "podcasts" as TabType, label: "Podcasts", icon: Music },
        { id: "tooltips" as TabType, label: "Tooltips", icon: MessageCircle },
        { id: "images" as TabType, label: "Cache de Imagens", icon: Image },
        { id: "videos" as TabType, label: "Inserir Vídeos (Vimeo)", icon: Video },
      ]
    },
    {
      id: "security",
      label: "Segurança",
      icon: Shield,
      items: [
        { id: "security-integrity" as TabType, label: "Segurança e Integridade", icon: ShieldCheck },
        { id: "security-dashboard" as TabType, label: "Dashboard de Segurança", icon: ShieldCheck },
        { id: "security-whitelist" as TabType, label: "Whitelist de IPs", icon: ShieldCheck },
        { id: "security-shield-config" as TabType, label: "Config. Security Shield", icon: Shield },
        { id: "security-audit-logs" as TabType, label: "Audit Logs", icon: ScrollText },
      ]
    },
    {
      id: "sales",
      label: "Vendas & CRM",
      icon: Users,
      items: [
        { id: "crm" as TabType, label: "CRM DataFlow", icon: Users },
      ]
    },
    {
      id: "messages-notifications",
      label: "MSG & NOTIFICAÇÃO",
      icon: Bell,
      items: [
        { id: "contact-messages" as TabType, label: "Mensagens de Contato", icon: MessageSquare },
        { id: "notification-logs" as TabType, label: "Notificações", icon: Bell },
      ]
    },
    {
      id: "audit",
      label: "Auditoria",
      icon: ClipboardCheck,
      items: [
        { id: "api-audit-logs" as TabType, label: "Log de APIs", icon: Webhook },
        { id: "activity-logs" as TabType, label: "Log de Atividades (admin)", icon: History },
        { id: "user-usage-logs" as TabType, label: "Log de Uso (Usuários)", icon: Users },
        { id: "document-routing-logs" as TabType, label: "Logs de Roteamento", icon: Route },
        { id: "tag-modification-logs" as TabType, label: "Logs de Mescla Tags", icon: Tags },
        { id: "suggestion-audit" as TabType, label: "Auditoria Sugestões", icon: Sparkles },
        { id: "ml-dashboard" as TabType, label: "Machine Learning ML", icon: Brain },
        { id: "taxonomy-ml-audit" as TabType, label: "Taxonomy ML", icon: Target },
        { id: "version-control" as TabType, label: "Versionamento", icon: GitBranch },
        { id: "documentation-sync" as TabType, label: "Sincronizar Docs", icon: RefreshCw },
        { id: "schema-monitor" as TabType, label: "Monitor de Schema", icon: Database },
      ]
    },
    {
      id: "indicators",
      label: "INDICADORES ECONÔMICOS",
      icon: TrendingUp,
      items: [
        { id: "economic-indicators" as TabType, label: "Painel de Indicadores", icon: BarChart3 },
        { id: "regional-indicators" as TabType, label: "Indicadores Regionais", icon: MapPin },
        { id: "pmc-conversion" as TabType, label: "PMC → R$", icon: DollarSign },
        { id: "market-news" as TabType, label: "Balcão de Notícias", icon: Newspaper },
        { id: "json-test" as TabType, label: "Teste de JSON", icon: TestTube },
        { id: "api-management" as TabType, label: "Gestão de APIs", icon: Webhook },
        { id: "json-data" as TabType, label: "JSON Dados", icon: FileJson },
      ]
    },
    {
      id: "analytics-hub",
      label: "ANALYTICS",
      icon: BarChart3,
      items: [
        { id: "dashboard-external" as TabType, label: "Dashboard", icon: LayoutDashboard },
        { id: "data-analysis" as TabType, label: "Data Analysis", icon: TrendingUp },
        { id: "chart-database" as TabType, label: "Chart DataSet", icon: Database },
        { id: "table-database" as TabType, label: "Table DataSet", icon: Database },
      ]
    },
    {
      id: "settings",
      label: "Configurações",
      icon: Settings,
      items: [
        { id: "app-config" as TabType, label: "Config. de Sistemas", icon: Settings },
        { id: "notification-settings" as TabType, label: "Config. Notificações", icon: Bell },
        { id: "whatsapp-tier" as TabType, label: "WhatsApp Tier", icon: TrendingUp },
        { id: "fallback-config" as TabType, label: "Fallback SMS", icon: ArrowRightLeft },
        { id: "user-registry" as TabType, label: "Cadastro de Usuários", icon: Users },
        { id: "analytics" as TabType, label: "Analytics", icon: BarChart3 },
      ]
    }
  ], []);

  // Get all items from all categories for favorite lookup
  const allItems = useMemo(() => {
    const items: { id: TabType; label: string; icon: any }[] = [
      { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard }
    ];
    baseMenuCategories.forEach(cat => {
      cat.items.forEach(item => items.push(item));
    });
    return items;
  }, [baseMenuCategories]);

  // Build dynamic quick-access category from favorites - FIXED: include favorites in deps
  const quickAccessCategory = useMemo(() => ({
    id: "quick-access",
    label: "Acesso Rápido",
    icon: Zap,
    items: favorites
      .map(favId => allItems.find(item => item.id === favId))
      .filter((item): item is { id: TabType; label: string; icon: any } => item !== undefined)
  }), [favorites, allItems]);

  // Combine quick-access with base categories - FIXED: include baseMenuCategories in deps
  const menuCategories = useMemo(() => [
    quickAccessCategory,
    ...baseMenuCategories
  ], [quickAccessCategory, baseMenuCategories]);

  // Filter menu categories based on search query - FIXED: include menuCategories in deps
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return menuCategories;
    
    const query = searchQuery.toLowerCase();
    
    return menuCategories
      .map(category => ({
        ...category,
        items: category.items.filter(item => 
          item.label.toLowerCase().includes(query) ||
          category.label.toLowerCase().includes(query)
        )
      }))
      .filter(category => category.items.length > 0);
  }, [searchQuery, menuCategories]);

  // Initial check and resize observer for scroll indicators
  useEffect(() => {
    handleNavScroll();
    const nav = navRef.current;
    if (!nav) return;

    const resizeObserver = new ResizeObserver(handleNavScroll);
    resizeObserver.observe(nav);
    
    return () => resizeObserver.disconnect();
  }, [handleNavScroll, filteredCategories]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={`
          ${isCollapsed ? 'w-[72px]' : 'w-[280px]'} 
          bg-sidebar border-r border-border 
          fixed left-0 top-0 h-screen z-50 
          flex flex-col overflow-hidden 
          transition-all duration-500 ease-in-out
        `}
      >
        {/* TOP HEADER: Hamburger + Search (Horizontal-to-Vertical Transformation) */}
        <div className={`
          border-b border-border shrink-0
          flex transition-all duration-500 ease-in-out
          ${isCollapsed 
            ? 'flex-col items-center w-full gap-4 px-3 py-4' 
            : 'flex-row items-center w-full gap-3 px-4 py-3'}
        `}>
          {/* 1. Hamburger Menu with Rotation Animation */}
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

          {/* 2. Search Component - Adapts to sidebar state */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="group h-10 w-10 rounded-full hover:bg-[#00D4FF]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] transition-all duration-500 ease-in-out"
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
            </div>
          ) : (
            <div className="relative flex-1 flex items-center gap-2 transition-all duration-500 ease-in-out">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-sm bg-muted/30 border-border rounded-full focus:border-primary/50 w-full"
                />
              </div>
              
            </div>
          )}
        </div>

        {/* Top fade indicator */}
        <div 
          className={`absolute top-[100px] left-0 right-0 h-6 bg-gradient-to-b from-sidebar to-transparent z-10 pointer-events-none transition-opacity duration-200 ${canScrollUp ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* MIDDLE NAVIGATION - Scrollable with margin-bottom for dock */}
        <nav 
          ref={navRef}
          onScroll={handleNavScroll}
          className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'} py-2 pb-48 space-y-1`}
        >
          {filteredCategories.map((category, index) => (
            <div key={category.id}>
              {index > 0 && <Separator className="my-2 bg-border/50" />}
              
              {isCollapsed ? (
                // Collapsed mode: ONLY parent category icon with click-to-expand
                <div className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="group w-full h-12 rounded-lg hover:bg-[#00D4FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 ease-in-out"
                        onClick={() => {
                          // Click-to-expand: Always expand sidebar first
                          onToggleCollapse();
                          // Then open this category's section
                          if (!openSections.includes(category.id)) {
                            toggleSection(category.id);
                          }
                        }}
                      >
                        <category.icon className="w-5 h-5 group-hover:text-black" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {category.label}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                // Expanded mode: full menu with collapsible sections
                <Collapsible 
                  open={openSections.includes(category.id)}
                  onOpenChange={() => toggleSection(category.id)}
                >
                  {(() => {
                    const hasActiveChild = category.items.some(item => item.id === activeTab);
                    return (
                      <CollapsibleTrigger className={`group flex items-center justify-between w-full p-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-300 ease-in-out ${
                        hasActiveChild
                          ? 'bg-fuchsia-800 text-white/90 shadow-sm'
                          : openSections.includes(category.id) 
                            ? 'bg-fuchsia-700/80 text-white/80 shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2">
                          <category.icon className={`w-3.5 h-3.5 ${hasActiveChild ? 'text-white/90' : openSections.includes(category.id) ? 'text-white/80' : 'group-hover:text-foreground'}`} />
                          {category.label}
                          {category.id === "messages-notifications" && (pendingMessagesCount + unreadNotificationsCount) > 0 && !openSections.includes(category.id) && (
                            <Badge variant="destructive" className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
                              {pendingMessagesCount + unreadNotificationsCount}
                            </Badge>
                          )}
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections.includes(category.id) ? 'rotate-180 text-white/80' : 'group-hover:text-foreground'}`} />
                      </CollapsibleTrigger>
                    );
                  })()}
                  
                  <CollapsibleContent className="space-y-0.5 mt-1">
                    {category.id === "quick-access" ? (
                      // Quick Access with drag-and-drop
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={favorites}
                          strategy={verticalListSortingStrategy}
                        >
                          {category.items.map((item) => (
                            <SortableFavoriteItem
                              key={item.id}
                              id={item.id}
                              item={item}
                              isActive={activeTab === item.id}
                              pendingMessagesCount={pendingMessagesCount}
                              unreadNotificationsCount={unreadNotificationsCount}
                              onTabChange={onTabChange}
                              onRemove={toggleFavorite}
                              navigate={navigate}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    ) : (
                      // Regular categories
                      category.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const showContactBadge = item.id === "contact-messages" && pendingMessagesCount > 0;
                        const showNotificationBadge = item.id === "notification-logs" && unreadNotificationsCount > 0;
                        const badgeCount = showContactBadge ? pendingMessagesCount : (showNotificationBadge ? unreadNotificationsCount : 0);

                        return (
                          <div key={item.id} className="flex items-center gap-1">
                            <Button
                              variant={isActive ? "default" : "ghost"}
                              className={`group flex-1 justify-start gap-3 h-9 rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted hover:text-foreground"} transition-all duration-200`}
                              onClick={() => {
                                // Navigate to external dashboard page
                                if (item.id === "dashboard-external") {
                                  navigate("/dashboard");
                                } else {
                                  onTabChange(item.id);
                                }
                              }}
                            >
                              <Icon className="w-4 h-4 shrink-0 group-hover:text-black" />
                              <span className="truncate">{item.label}</span>
                              {(showContactBadge || showNotificationBadge) && (
                                <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
                                  {badgeCount}
                                </Badge>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.id);
                              }}
                            >
                              <Star 
                                className={`h-3.5 w-3.5 transition-colors ${
                                  favorites.includes(item.id) 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-muted-foreground hover:text-yellow-400'
                                }`} 
                              />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ))}
        </nav>


        {/* BOTTOM DOCK - Control Center (Gemini-style fixed footer) */}
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
            // SCENARIO A: Sidebar COLLAPSED - Always vertical icons only
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-10 w-10 rounded-lg hover:bg-muted transition-all duration-200"
                    onClick={() => navigate("/docs")}
                  >
                    <BookOpen className="w-4 h-4 group-hover:text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.documentation')}</TooltipContent>
              </Tooltip>

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
                    className="group h-10 w-10 rounded-lg hover:bg-muted transition-all duration-200"
                    onClick={() => navigate("/dashboard")}
                  >
                    <LayoutDashboard className="w-4 h-4 group-hover:text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Dashboard</TooltipContent>
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
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.logout')}</TooltipContent>
              </Tooltip>
            </div>
          ) : isControlCenterCollapsed ? (
            // SCENARIO B-2: Sidebar EXPANDED + Control Center COLLAPSED - Horizontal row of icons
            <div className="flex flex-row items-center justify-around py-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="group h-9 w-9 rounded-lg hover:bg-muted transition-all duration-200"
                    onClick={() => navigate("/docs")}
                  >
                    <BookOpen className="w-4 h-4 group-hover:text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('admin.documentation')}</TooltipContent>
              </Tooltip>

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
                    className="group h-9 w-9 rounded-lg hover:bg-muted transition-all duration-200"
                    onClick={() => navigate("/dashboard")}
                  >
                    <LayoutDashboard className="w-4 h-4 group-hover:text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Dashboard</TooltipContent>
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
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('admin.logout')}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            // SCENARIO B-1: Sidebar EXPANDED + Control Center EXPANDED (default) - Vertical with text
            <div className="flex flex-col gap-0.5">
              <Button 
                variant="ghost" 
                className="group w-full justify-start gap-3 h-9 rounded-lg hover:bg-muted transition-all duration-200"
                onClick={() => navigate("/docs")}
              >
                <BookOpen className="w-4 h-4 shrink-0 group-hover:text-foreground" />
                <span className="whitespace-nowrap">{t('admin.documentation')}</span>
              </Button>

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
                className="group w-full justify-start gap-3 h-9 rounded-lg hover:bg-muted transition-all duration-200"
                onClick={() => navigate("/dashboard")}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 group-hover:text-foreground" />
                <span className="whitespace-nowrap">Dashboard</span>
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
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{t('admin.logout')}</span>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};
