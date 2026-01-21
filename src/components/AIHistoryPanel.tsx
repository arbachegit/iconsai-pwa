import { useState, useEffect, useRef } from "react";
import { X, Play, StopCircle, Download, FileDown, Shield, Radio, Cpu, KeyRound, MessageCircle, Network, GitBranch, Globe, Users, Brain, Sparkles, FileText, MessageSquare, Rocket, ChevronDown, LucideIcon, Type, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHistoryCarousel } from "./MobileHistoryCarousel";
import { cn } from "@/lib/utils";
import { generateAudioUrl } from "@/lib/audio-player";
import { useTranslation } from "react-i18next";
import jsPDF from 'jspdf';
import { useQuery } from "@tanstack/react-query";
import { useAdminSettings } from "@/hooks/useAdminSettings";

// Tipagem TypeScript para Vimeo Player API
declare global {
  interface Window {
    Vimeo?: {
      Player: new (element: HTMLElement) => {
        on: (event: string, callback: () => void) => void;
      };
    };
  }
}

interface AIHistoryPanelProps {
  onClose: () => void;
}

interface TimelineEvent {
  id: string;
  tooltip_key: string;
  title: string;
  content: string;
  category: string | null;
}

// Icon mapping for historical events
const ICON_MAP: Record<string, LucideIcon> = {
  'history-talos': Shield,
  'history-telegraph': Radio,
  'history-turing-machine': Cpu,
  'history-enigma': KeyRound,
  'history-turing-test': MessageCircle,
  'history-arpanet': Network,
  'history-tcpip': GitBranch,
  'history-www': Globe,
  'history-web2': Users,
  'history-watson': Brain,
  'history-openai': Sparkles,
  'history-gpt3': FileText,
  'history-chatgpt': MessageSquare,
  'history-current': Rocket
};

// Extract event ID from tooltip_key (e.g., 'history-talos' -> 'talos')
const getEventId = (tooltipKey: string) => tooltipKey.replace('history-', '');

export const AIHistoryPanel = ({ onClose }: AIHistoryPanelProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { settings } = useAdminSettings();
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 550, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentEventId, setCurrentEventId] = useState("talos");
  const [visibleBadges, setVisibleBadges] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eventRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const timelineRef = useRef<HTMLDivElement | null>(null);
  
  const vimeoUrl = settings?.vimeo_history_url;
  
  // Fetch timeline events from database
  const { data: dbEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['timeline-history-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tooltip_contents')
        .select('id, tooltip_key, title, content, category')
        .like('tooltip_key', 'history-%');
      
      if (error) throw error;
      return (data || []) as TimelineEvent[];
    }
  });

  // Map database events to timeline format with icons
  const timelineData = (dbEvents || []).map(event => {
    const eventId = getEventId(event.tooltip_key);
    return {
      id: eventId,
      tooltip_key: event.tooltip_key,
      date: event.category || '',
      title: event.title,
      description: event.content,
      icon: ICON_MAP[event.tooltip_key] || Rocket,
      era: eventId
    };
  });

  // Texto completo para áudio (concatenação de todos os eventos)
  const fullText = timelineData.map(event => 
    `${event.date} - ${event.title}. ${event.description}`
  ).join('\n\n');

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handlePlayAudio = async () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      try {
        setIsLoadingAudio(true);
        const audioUrl = await generateAudioUrl(fullText);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime);
        });

        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });

        audio.addEventListener('ended', () => {
          setIsPlaying(false);
        });

        audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Erro ao gerar áudio:', error);
      } finally {
        setIsLoadingAudio(false);
      }
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleDownloadAudio = () => {
    if (audioRef.current) {
      const link = document.createElement('a');
      link.href = audioRef.current.src;
      link.download = 'historia-da-ia.mp3';
      link.click();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timestamps de cada evento no áudio (distribuídos uniformemente)
  const eventTimestamps = timelineData.map((event, idx) => ({
    id: event.id,
    startTime: idx * 20, // ~20 segundos por evento
    endTime: (idx + 1) * 20
  }));

  // Images cache - disabled since generated_images table doesn't have section_id column
  const cachedImages: Record<string, string> = {};

  // Derivar eventImages do cache
  const eventImages = cachedImages || {};
  
  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  // Helper para construir URL do Vimeo com parâmetros de privacidade e otimização
  const buildVimeoUrl = (baseUrl: string | undefined): string | null => {
    if (!baseUrl) return null;
    
    try {
      const url = new URL(baseUrl);
      const params = new URLSearchParams(url.search);
      
      params.set('dnt', '1');           // Do Not Track (privacidade)
      params.set('quality', 'auto');    // Qualidade automática
      params.set('responsive', '1');    // Responsivo
      params.set('playsinline', '1');   // Evita fullscreen no iOS
      
      url.search = params.toString();
      return url.toString();
    } catch {
      return baseUrl; // Retorna URL original se parsing falhar
    }
  };

  // Helper para scroll suave com fallback para navegadores antigos
  const safeScrollIntoView = (element: HTMLElement | null, options: ScrollIntoViewOptions) => {
    if (!element) return;
    
    try {
      element.scrollIntoView(options);
    } catch {
      // Fallback para navegadores antigos (Safari < 15.4)
      element.scrollIntoView(options.block === 'center');
    }
  };

  // Intersection Observer para detectar badges na tela (apenas desktop)
  useEffect(() => {
    if (isMobile) return; // Não usar no mobile
    
    // Verificar suporte ao IntersectionObserver (IE11, Safari antigo)
    if (!('IntersectionObserver' in window)) {
      // Fallback: mostrar todos os badges imediatamente
      setVisibleBadges(new Set(timelineData.map(e => e.id)));
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const eventId = entry.target.getAttribute('data-event-id');
            if (eventId) {
              setVisibleBadges(prev => new Set([...prev, eventId]));
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    // Observar todos os eventos
    Object.values(eventRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [timelineData, isMobile]);

  // Listen for global stop audio event
  useEffect(() => {
    const handleStopAll = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    
    window.addEventListener('stopAllAudio', handleStopAll);
    return () => window.removeEventListener('stopAllAudio', handleStopAll);
  }, []);
  
  // Vimeo Player API - Auto-scroll para timeline quando vídeo terminar
  useEffect(() => {
    if (!vimeoUrl) return;
    
    // Carregar script do Vimeo Player API se não existir
    if (!document.querySelector('script[src*="player.vimeo.com/api"]')) {
      const script = document.createElement('script');
      script.src = 'https://player.vimeo.com/api/player.js';
      script.async = true;
      document.body.appendChild(script);
      
      script.onload = () => initVimeoPlayer();
    } else {
      initVimeoPlayer();
    }
    
    function initVimeoPlayer() {
      const iframe = document.getElementById('vimeo-player');
      if (iframe && window.Vimeo) {
        const player = new window.Vimeo.Player(iframe);
        
        player.on('ended', () => {
          // Auto-scroll para a timeline quando vídeo terminar
          safeScrollIntoView(timelineRef.current, {
            behavior: 'smooth',
            block: 'start'
          });
        });
      }
    }
  }, [vimeoUrl]);
  
  // Função para pular para um evento específico
  const handleJumpToEvent = (eventId: string) => {
    setCurrentEventId(eventId);
    
    // Scroll para o evento (desktop)
    if (!isMobile && eventRefs.current[eventId]) {
      safeScrollIntoView(eventRefs.current[eventId], {
        behavior: 'smooth',
        block: 'center'
      });
    }
    
    // Se áudio existir, pula para o timestamp do evento
    if (audioRef.current) {
      const eventTimestamp = eventTimestamps.find(e => e.id === eventId);
      if (eventTimestamp) {
        audioRef.current.currentTime = eventTimestamp.startTime;
      }
    }
  };

  const cycleFontSize = () => {
    setFontSize(prev => {
      if (prev === 'normal') return 'large';
      if (prev === 'large') return 'xlarge';
      return 'normal';
    });
  };

  // Auto-scroll sincronizado com áudio
  useEffect(() => {
    if (!isPlaying) return;

    const currentEvent = eventTimestamps.find(
      (event) => currentTime >= event.startTime && currentTime < event.endTime
    );

    if (currentEvent && currentEvent.id !== currentEventId) {
      setCurrentEventId(currentEvent.id);
      
      // Desktop: scroll suave para a seção
      if (!isMobile && eventRefs.current[currentEvent.id]) {
        safeScrollIntoView(eventRefs.current[currentEvent.id], {
          behavior: 'smooth',
          block: 'center'
        });
      }
      // Mobile: o carousel já sincroniza via props currentEventId
    }
  }, [currentTime, isPlaying, isMobile, currentEventId]);
  
  // Exportar para PDF
  const exportTimelineToPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Título
    pdf.setFontSize(20);
    pdf.text(t('aiHistory.title'), 20, 20);
    
    // Subtítulo
    pdf.setFontSize(12);
    pdf.text('De Talos à Febre da IA', 20, 30);
    
    let yPosition = 45;
    
    timelineData.forEach((event, idx) => {
      // Nova página se necessário
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
      
      // Data
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(event.date, 20, yPosition);
      
      // Título
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(event.title, 20, yPosition + 6);
      
      // Descrição
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      const splitText = pdf.splitTextToSize(event.description, 170);
      pdf.text(splitText, 20, yPosition + 12);
      
      yPosition += 20 + (splitText.length * 4);
    });
    
    pdf.save('linha-do-tempo-ia.pdf');
  };

  // Renderização mobile
  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[90vh]">
          <div className="p-4 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {t('aiHistory.timeline.title')}
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Separator */}
            <Separator className="my-4 bg-primary/30" />
            
            {/* Vimeo Video */}
            {vimeoUrl && (
              <>
                <div className="mb-2 rounded-lg overflow-hidden border border-primary/20 aspect-video">
                  <iframe
                    id="vimeo-player"
                    src={buildVimeoUrl(vimeoUrl) || ''}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                    allowFullScreen
                    title="A história da IA"
                    loading="lazy"
                  />
                </div>
                
                {/* Indicador visual de scroll - Mobile */}
                <div className="flex flex-col items-center mb-2 text-muted-foreground animate-bounce">
                  <span className="text-xs font-medium">
                    Deslize para ver a Timeline
                  </span>
                  <ChevronDown className="w-5 h-5 mt-1" />
                </div>
              </>
            )}
            
            {/* Badge Navigation */}
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {timelineData.map((event) => {
                  const Icon = event.icon;
                  return (
                    <Badge
                      key={event.id}
                      variant={currentEventId === event.id ? "default" : "outline"}
                      className="cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0"
                      onClick={() => handleJumpToEvent(event.id)}
                    >
                      <Icon className="w-3 h-3" />
                      {event.date}
                    </Badge>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Audio Controls */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Button onClick={handlePlayAudio} disabled={isPlaying || isLoadingAudio} size="sm" variant="outline">
                  {isLoadingAudio ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                  {isLoadingAudio ? t('audio.loading') : t('audio.play')}
                </Button>
                <Button onClick={handleStopAudio} disabled={!isPlaying} size="sm" variant="outline">
                  <StopCircle className="w-4 h-4 mr-1" />
                  {t('audio.stop')}
                </Button>
                <Button onClick={handleDownloadAudio} disabled={!audioRef.current} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" />
                  {t('audio.download')}
                </Button>
                <Button onClick={exportTimelineToPDF} size="sm" variant="outline">
                  <FileDown className="w-4 h-4 mr-1" />
                  PDF
                </Button>
                <Button onClick={cycleFontSize} size="sm" variant="outline" title="Aumentar tamanho da fonte">
                  <Type className="w-4 h-4 mr-1" />
                  {fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}
                </Button>
              </div>
              {duration > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px]">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
              )}
            </div>

            <div ref={timelineRef}>
              <MobileHistoryCarousel 
                events={timelineData}
                currentEventId={currentEventId}
                eventImages={eventImages}
                loadingImages={false}
                onEventSelect={handleJumpToEvent}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Renderização desktop
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('stopAllAudio'));
          onClose();
        }}
      />
      
      <Card
        className="fixed z-50 w-[1100px] h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-md border-primary/20 shadow-2xl animate-scale-in"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="relative">
          {/* Header - Sticky */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-primary/20">
            <div className="flex items-center justify-between p-6 pb-3">
              <div className="flex-1">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  {t('aiHistory.timeline.title')}
                </h2>
                <Separator className="mt-2 bg-primary/30" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-4 hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Video Section - Ocupa tela inicial */}
          <div className="flex flex-col items-center px-6 pt-4">
            {vimeoUrl && (
              <>
                <div className="w-full max-w-4xl rounded-lg overflow-hidden border border-primary/20 aspect-video">
                  <iframe
                    id="vimeo-player"
                    src={buildVimeoUrl(vimeoUrl) || ''}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                    allowFullScreen
                    title="A história da IA"
                    loading="lazy"
                  />
                </div>
                
                {/* Indicador visual de scroll */}
                <div className="flex flex-col items-center mt-6 mb-4 text-muted-foreground animate-bounce">
                  <span className="text-sm font-medium">
                    Role para ver a Timeline
                  </span>
                  <ChevronDown className="w-6 h-6 mt-1" />
                </div>
              </>
            )}
          </div>

          {/* Timeline Section - Aparece ao rolar */}
          <div ref={timelineRef} className="px-6 pb-6 space-y-4">
            {/* Badge Navigation */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {timelineData.map((event) => {
                const Icon = event.icon;
                return (
                  <Badge
                    key={event.id}
                    variant={currentEventId === event.id ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap flex items-center gap-1"
                    onClick={() => handleJumpToEvent(event.id)}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="text-xs">{event.date}</span>
                  </Badge>
                );
              })}
            </div>

            {/* Audio Controls */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  onClick={handlePlayAudio}
                  disabled={isPlaying || isLoadingAudio}
                  size="sm"
                  variant="outline"
                >
                  {isLoadingAudio ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  {isLoadingAudio ? t('audio.loading') : t('audio.play')}
                </Button>
                <Button
                  onClick={handleStopAudio}
                  disabled={!isPlaying}
                  size="sm"
                  variant="outline"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  {t('audio.stop')}
                </Button>
                <Button
                  onClick={handleDownloadAudio}
                  disabled={!audioRef.current}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('audio.download')}
                </Button>
                <Button
                  onClick={exportTimelineToPDF}
                  size="sm"
                  variant="outline"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button
                  onClick={cycleFontSize}
                  size="sm"
                  variant="outline"
                  title="Aumentar tamanho da fonte"
                >
                  <Type className="w-4 h-4 mr-2" />
                  {fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}
                </Button>
              </div>
              {duration > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
              )}
            </div>

            {/* Indicador de progresso da timeline */}
            <div className="px-4 py-3 border-t border-border/50 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progresso da Timeline</span>
                <span className="font-mono text-primary font-bold">
                  {visibleBadges.size} / {timelineData.length} eventos
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                  style={{ width: `${(visibleBadges.size / timelineData.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Timeline Events */}
            <div className="space-y-3 ml-8">
              {timelineData.map((event) => {
                const Icon = event.icon;
                return (
                  <div
                    key={event.id}
                    ref={(el) => (eventRefs.current[event.id] = el)}
                    data-event-id={event.id}
                    className={cn(
                      "relative pl-10 border-l-2 transition-all duration-500 pb-2",
                      currentEventId === event.id
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-primary/30"
                    )}
                  >
                    <div
                      className="absolute -left-5 top-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg bg-primary"
                    >
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        {/* Badge com data em fonte Typewriter - 2x maior com máxima visibilidade */}
                        <Badge 
                          variant="outline" 
                          className="mb-4 font-mono text-xs tracking-widest px-2.5 py-1 border-2 border-primary bg-primary/40 !text-white font-extrabold shadow-lg"
                        >
                          {event.date}
                        </Badge>
                        <h3 className={cn(
                          "font-bold text-primary mb-1",
                          fontSize === 'normal' && "text-lg",
                          fontSize === 'large' && "text-xl",
                          fontSize === 'xlarge' && "text-2xl"
                        )}>
                          {event.title}
                        </h3>
                        <p className={cn(
                          "text-muted-foreground leading-snug",
                          fontSize === 'normal' && "text-sm",
                          fontSize === 'large' && "text-base",
                          fontSize === 'xlarge' && "text-lg"
                        )}>
                          {event.description}
                        </p>
                      </div>

                      {/* Imagem do evento */}
                      <div className="w-40 flex-shrink-0">
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border">
                        {false ? (
                            <Skeleton className="w-full h-full" />
                          ) : eventImages[event.id] ? (
                            <img
                              src={eventImages[event.id]}
                              alt={event.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon className="w-12 h-12 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};
