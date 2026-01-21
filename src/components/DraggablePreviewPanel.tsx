import { useState, useRef, useEffect } from "react";
import { X, Play, Square, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTooltipContent } from "@/hooks/useTooltipContent";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface DraggablePreviewPanelProps {
  sectionId: string;
  onClose: () => void;
}

export const DraggablePreviewPanel = ({
  sectionId,
  onClose,
}: DraggablePreviewPanelProps) => {
  const { content, isLoading, updateContent } = useTooltipContent(sectionId);
  const { toast } = useToast();
  
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Section images - disabled since generated_images table doesn't have section_id column
  const sectionImage: string | undefined = undefined;

  // Parse subtitle and main content
  const parseContent = (text: string) => {
    const lines = text.split('\n\n');
    let subtitle = "";
    let mainContent = text;
    
    // Look for subtitle pattern (usually after first paragraph)
    if (lines.length > 1) {
      // Check if second paragraph looks like a subtitle (shorter, bold-like text)
      const potentialSubtitle = lines[1].trim();
      if (potentialSubtitle.length < 100) {
        subtitle = potentialSubtitle;
        mainContent = [lines[0], ...lines.slice(2)].join('\n\n');
      }
    }
    
    return { subtitle, mainContent };
  };

  const { subtitle, mainContent } = content 
    ? parseContent(content.content) 
    : { subtitle: "", mainContent: "" };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".no-drag")) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Cleanup: parar áudio quando o componente for fechado
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayAudio = () => {
    if (!content?.audio_url) {
      toast({
        title: "Áudio não disponível",
        description: "Este tooltip ainda não possui áudio.",
        variant: "destructive",
      });
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(content.audio_url);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      };
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };
    }
    
    audioRef.current.play();
    setIsPlaying(true);
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
    if (content?.audio_url) {
      const link = document.createElement('a');
      link.href = content.audio_url;
      link.download = `tooltip-${sectionId}-audio.mp3`;
      link.click();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <Card
        ref={panelRef}
        className="fixed z-50 w-[700px] max-h-[700px] flex flex-col bg-card/95 backdrop-blur-md border-primary/20 shadow-2xl"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <div
          className="flex items-center justify-between p-4 border-b border-primary/20"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h3 className="font-semibold text-foreground">Informações</h3>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="no-drag"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-drag">
          {/* Main Title */}
          <h2 className="text-2xl font-bold text-gradient">
            {content?.title}
          </h2>

          {/* Audio Controls */}
          {content?.audio_url && (
            <div className="space-y-3 pb-4 border-b border-primary/20">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayAudio}
                  disabled={isPlaying}
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  Play
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopAudio}
                  disabled={!isPlaying}
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAudio}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
              
              <div className="space-y-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section Image */}
          {sectionImage && (
            <div className="rounded-lg overflow-hidden">
              <img 
                src={sectionImage} 
                alt={content?.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Intermediate Subtitle */}
          {subtitle && (
            <div className="py-4 border-t border-b border-primary/20">
              <h3 className="text-lg font-semibold text-foreground/90">
                {subtitle}
              </h3>
            </div>
          )}

          {/* Main Content */}
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {mainContent}
          </p>
        </div>

      </Card>
    </>
  );
};
