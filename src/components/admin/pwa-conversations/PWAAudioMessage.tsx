import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { PWAConversationMessage } from '@/types/pwa-conversations';
import { Play, Pause, Share2, FileText, Download, AlertCircle, Loader2, Volume2, User, Bot, MessageSquare, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface PWAAudioMessageProps {
  message: PWAConversationMessage;
  moduleColor: string;
  isSummary?: boolean;
  taxonomyTags?: string[];
}

export const PWAAudioMessage = ({ 
  message, 
  moduleColor, 
  isSummary = false,
  taxonomyTags = []
}: PWAAudioMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(message.audio_duration || 0);
  const [showTranscription, setShowTranscription] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isUser = message.role === 'user';
  const hasAudio = Boolean(message.audio_url && message.audio_url.length > 0);
  
  // PRD: Agente=ESQUERDA (mr-auto), Usuario=DIREITA (ml-auto)
  const alignment = isUser ? 'ml-auto' : 'mr-auto';

  // CORES INLINE para garantir visibilidade em light E dark mode
  // PRD: Agente = VERDE CLARO, Usuario = BRANCO
  const bgStyle = isUser 
    ? { backgroundColor: '#ffffff', color: '#1e293b' }  // Branco com texto escuro
    : { backgroundColor: '#bbf7d0', color: '#1e293b' }; // Verde claro com texto escuro
  
  const borderStyle = isUser
    ? { borderLeft: '4px solid #94a3b8' }  // Cinza para usuario
    : { borderLeft: '4px solid #22c55e' }; // Verde para agente

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const initAudio = () => {
    if (!message.audio_url || audioRef.current) return;
    
    setIsLoading(true);
    setHasError(false);
    
    const audio = new Audio(message.audio_url);
    audioRef.current = audio;
    
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setIsLoading(false);
    });
    
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
    });
    
    audio.addEventListener('error', () => {
      console.error('[PWAAudioMessage] Erro ao carregar audio:', message.audio_url);
      setHasError(true);
      setIsLoading(false);
    });
    
    audio.addEventListener('canplay', () => setIsLoading(false));
  };

  const handlePlayPause = () => {
    if (!message.audio_url) return;
    
    if (!audioRef.current) {
      initAudio();
      setTimeout(() => {
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
      }, 100);
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = (value[0] / 100) * audioRef.current.duration;
      setProgress(value[0]);
    }
  };

  const handleShareAudio = () => {
    if (message.audio_url) {
      navigator.clipboard.writeText(message.audio_url);
      toast.success('Link do audio copiado');
    }
  };

  const handleShareTranscription = () => {
    const text = message.transcription || message.content || '';
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success('Transcricao copiada');
    }
  };

  const handleDownload = () => {
    if (message.audio_url) {
      const link = document.createElement('a');
      link.href = message.audio_url;
      link.download = `audio-${message.id}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // PRD: Max 6 tags no header
  const displayTags = (taxonomyTags || []).slice(0, 6);

  // SEM AUDIO = apenas texto
  if (!hasAudio) {
    return (
      <div 
        className={`rounded-lg p-3 max-w-[75%] ${alignment}`}
        style={{ ...bgStyle, ...borderStyle }}
      >
        {/* HEADER: Taxonomia (max 6) */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {displayTags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs gap-1" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* CORPO: Texto */}
        <div className="text-sm">
          <p className="whitespace-pre-wrap">
            {message.content || message.transcription || 'Sem conteudo'}
          </p>
        </div>
        
        {/* FOOTER: Indicador role + horario */}
        <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: '#475569' }}>
          {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
          <span>{isUser ? 'Usuario' : 'Assistente'}</span>
          <span>|</span>
          <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    );
  }

  // COM AUDIO = player completo com HEADER e FOOTER
  return (
    <div 
      className={`rounded-lg p-3 max-w-[75%] ${alignment}`}
      style={{ ...bgStyle, ...borderStyle }}
    >
      {/* ========== HEADER ========== */}
      {/* PRD: "No header havera palavras associadas a taxonomia global e temas chaves. Serao no maximo 6 palavras" */}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {displayTags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs gap-1" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </Badge>
          ))}
        </div>
      )}
      
      {/* ========== CORPO: PLAYER DE AUDIO ========== */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {/* Botao Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
            onClick={handlePlayPause}
            disabled={isLoading || hasError}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : hasError ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>
          
          {/* Slider + Duracao */}
          <div className="flex-1 space-y-1">
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="cursor-pointer"
              disabled={hasError}
            />
            <div className="flex justify-between text-xs" style={{ color: '#475569' }}>
              <span>{formatDuration((progress / 100) * duration)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
          
          <Volume2 className="w-4 h-4 shrink-0" style={{ color: '#475569' }} />
        </div>

        {/* Erro */}
        {hasError && (
          <div className="flex items-center gap-2 text-xs text-red-600">
            <AlertCircle className="w-3 h-3" />
            <span>Erro ao carregar audio</span>
          </div>
        )}

        {/* Transcricao expandida */}
        {showTranscription && (
          <div className="mt-2 p-2 rounded text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
            <p className="font-medium text-xs mb-1">Transcricao:</p>
            <p className="whitespace-pre-wrap">{message.transcription || message.content || 'Nao disponivel'}</p>
          </div>
        )}
      </div>
      
      {/* ========== FOOTER ========== */}
      {/* PRD: "No footer de cada audio contera quatro funcionalidades: compartilhar audio, compartilhar transcricao, transcrever e fazer download" */}
      <div className="flex flex-wrap items-center gap-1 mt-3 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleShareAudio}>
          <Share2 className="w-3.5 h-3.5" />
          Compartilhar Audio
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleShareTranscription}>
          <MessageSquare className="w-3.5 h-3.5" />
          Compartilhar Texto
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs gap-1"
          onClick={() => setShowTranscription(!showTranscription)}
        >
          <FileText className="w-3.5 h-3.5" />
          {showTranscription ? 'Ocultar' : 'Transcrever'}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownload}>
          <Download className="w-3.5 h-3.5" />
          Download
        </Button>
      </div>
      
      {/* Indicador role + horario */}
      <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: '#475569' }}>
        {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
        <span>{isUser ? 'Usuario' : 'Assistente'}</span>
        <span>|</span>
        <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};
