import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, BarChart3, Bot, GitBranch, ChevronRight, RotateCcw, Smartphone, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { AIChat } from '@/components/dashboard/AIChat';
import { IndicatorAPITable } from '@/components/dashboard/IndicatorAPITable';
import { useLandscapeMode } from '@/hooks/useLandscapeMode';
import { cn } from '@/lib/utils';

interface MobilePlatformViewProps {
  isAdmin?: boolean;
}

type ViewType = 'chat' | 'api' | 'dataflow-architecture' | 'dataflow-new-domain' |
  'dataflow-talk-app' | 'dataflow-retail-system' | 'dataflow-autocontrol';

const STORAGE_KEY = 'knowyou-mobile-last-view';

const dataFlowItems: { id: ViewType; label: string }[] = [
  { id: 'dataflow-architecture', label: 'Architecture' },
  { id: 'dataflow-new-domain', label: 'New Domain' },
  { id: 'dataflow-talk-app', label: 'Talk APP' },
  { id: 'dataflow-retail-system', label: 'Retail System' },
  { id: 'dataflow-autocontrol', label: 'AutoControl' },
];

export function MobilePlatformView({ isAdmin = false }: MobilePlatformViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const [previousView, setPreviousView] = useState<ViewType>('chat');
  const [dataFlowExpanded, setDataFlowExpanded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isDataFlowView = activeView.startsWith('dataflow-');
  const { isLandscape, showRotateMessage } = useLandscapeMode(isDataFlowView);

  // Carregar última view do localStorage para admin
  useEffect(() => {
    if (isAdmin) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && ['chat', 'api', ...dataFlowItems.map(d => d.id)].includes(saved)) {
          setActiveView(saved as ViewType);
          if (saved.startsWith('dataflow-')) {
            setDataFlowExpanded(true);
          }
        }
      } catch (e) {
        console.log('Could not load saved view');
      }
    }
  }, [isAdmin]);

  // Salvar view atual no localStorage
  useEffect(() => {
    if (isAdmin) {
      try {
        localStorage.setItem(STORAGE_KEY, activeView);
      } catch (e) {
        console.log('Could not save view');
      }
    }
  }, [activeView, isAdmin]);

  const handleMenuClick = (viewId: ViewType) => {
    if (viewId !== activeView) {
      setIsTransitioning(true);
      setPreviousView(activeView);
      
      // Pequeno delay para animação
      setTimeout(() => {
        setActiveView(viewId);
        setTimeout(() => setIsTransitioning(false), 300);
      }, 150);
    }
    setMenuOpen(false);
  };

  const getDataFlowLabel = () => {
    const item = dataFlowItems.find(i => i.id === activeView);
    return item?.label || 'DataFlow';
  };

  // Se não é admin, mostra apenas o chat fullscreen
  if (!isAdmin) {
    return (
      <div className="h-screen w-full bg-background">
        <AIChat />
      </div>
    );
  }

  // Overlay para forçar landscape no DataFlow
  const LandscapeOverlay = () => (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      <div className="text-center p-8 max-w-sm animate-scale-in">
        <div className="relative mx-auto mb-6">
          <div className="w-24 h-16 border-2 border-primary rounded-lg flex items-center justify-center bg-primary/10">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <RotateCcw className="absolute -right-4 -bottom-2 w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        
        <h2 className="text-xl font-bold text-foreground mb-3">
          Rotacione seu Dispositivo
        </h2>
        <p className="text-muted-foreground mb-4">
          Para melhor visualização do <span className="font-medium text-primary">{getDataFlowLabel()}</span>, 
          gire seu celular para o modo paisagem.
        </p>
        
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-3 h-3 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );

  // Admin: Chat + Hamburger Menu
  return (
    <div className="h-screen w-full bg-background flex flex-col">
      {/* Overlay de landscape para DataFlow */}
      {isDataFlowView && showRotateMessage && !isLandscape && <LandscapeOverlay />}

      {/* Header com Hamburger */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        <h1 className="text-lg font-semibold text-foreground">KnowYOU</h1>
        
        <div className="flex items-center gap-2">
          {/* Ícone Brain - Link Admin */}
          <Link 
            to="/admin" 
            className="text-foreground/60 hover:text-primary transition-colors p-2"
            title="Admin Panel"
          >
            <Brain className="w-5 h-5" />
          </Link>
          
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 !bg-card border-l border-border">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <nav className="flex flex-col pt-6">
              <div className="px-4 pb-4 border-b border-border">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Menu
                </h2>
              </div>

              {/* API */}
              <button
                onClick={() => handleMenuClick('api')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-left transition-all duration-200",
                  "hover:bg-muted/50 hover:translate-x-1",
                  activeView === 'api' && "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                )}
              >
                <BarChart3 className="h-5 w-5" />
                <span>API</span>
              </button>

              {/* IA */}
              <button
                onClick={() => handleMenuClick('chat')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-left transition-all duration-200",
                  "hover:bg-muted/50 hover:translate-x-1",
                  activeView === 'chat' && "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                )}
              >
                <Bot className="h-5 w-5" />
                <span>IA</span>
              </button>

              {/* DataFlow (expansível) */}
              <div className="border-t border-border">
                <button
                  onClick={() => setDataFlowExpanded(!dataFlowExpanded)}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-left transition-all duration-200",
                    "hover:bg-muted/50",
                    isDataFlowView && "text-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="h-5 w-5" />
                    <span>DataFlow</span>
                  </div>
                  <div className={cn(
                    "transition-transform duration-200",
                    dataFlowExpanded && "rotate-90"
                  )}>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
                
                <div className={cn(
                  "overflow-hidden transition-all duration-300 ease-out",
                  dataFlowExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                )}>
                  <div className="bg-muted/30">
                    {dataFlowItems.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => handleMenuClick(item.id)}
                        style={{ transitionDelay: `${index * 50}ms` }}
                        className={cn(
                          "w-full text-left pl-12 pr-4 py-2.5 text-sm transition-all duration-200",
                          "hover:bg-muted/50 hover:translate-x-1",
                          activeView === item.id && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Conteúdo baseado na view ativa com transições */}
      <main className="flex-1 overflow-hidden relative">
        {/* Chat View */}
        <div className={cn(
          "absolute inset-0 transition-all duration-300 ease-out",
          activeView === 'chat' 
            ? "opacity-100 translate-x-0" 
            : previousView === 'chat' && isTransitioning
              ? "opacity-0 -translate-x-4"
              : "opacity-0 pointer-events-none translate-x-4"
        )}>
          {(activeView === 'chat' || previousView === 'chat') && <AIChat />}
        </div>
        
        {/* API View */}
        <div className={cn(
          "absolute inset-0 transition-all duration-300 ease-out overflow-auto p-4",
          activeView === 'api' 
            ? "opacity-100 translate-x-0" 
            : previousView === 'api' && isTransitioning
              ? "opacity-0 -translate-x-4"
              : "opacity-0 pointer-events-none translate-x-4"
        )}>
          {(activeView === 'api' || previousView === 'api') && <IndicatorAPITable />}
        </div>
        
        {/* DataFlow Views */}
        <div className={cn(
          "absolute inset-0 transition-all duration-300 ease-out overflow-auto p-4",
          isDataFlowView 
            ? "opacity-100 translate-x-0" 
            : previousView.startsWith('dataflow-') && isTransitioning
              ? "opacity-0 -translate-x-4"
              : "opacity-0 pointer-events-none translate-x-4"
        )}>
          {(isDataFlowView || previousView.startsWith('dataflow-')) && (
            <div className="bg-card rounded-lg border border-border p-6 min-h-[300px] flex items-center justify-center animate-fade-in">
              <div className="text-center space-y-2">
                <GitBranch className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">{getDataFlowLabel()}</h3>
                <p className="text-sm text-muted-foreground">
                  Visualização do fluxo de dados
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
