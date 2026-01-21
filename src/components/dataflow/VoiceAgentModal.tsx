import { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Pause, 
  X,
  Building2, 
  Landmark, 
  ShoppingCart, 
  Settings2, 
  GraduationCap, 
  Heart, 
  MessageSquare,
  Mic,
  Loader2,
  LucideIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  salesmanId?: string;
}

interface PresentationScript {
  title: string;
  audio_script: string;
  icon: string;
  duration_seconds: number;
  description?: string;
}

const topicIconMap: Record<string, LucideIcon> = {
  architecture: Building2,
  govsystem: Landmark,
  retail: ShoppingCart,
  autocontrol: Settings2,
  tutor: GraduationCap,
  healthcare: Heart,
  talkapp: MessageSquare,
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0,2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0,2)}) ${numbers.slice(2,7)}-${numbers.slice(7,11)}`;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function VoiceAgentModal({ isOpen, onClose, topic, salesmanId }: VoiceAgentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [script, setScript] = useState<PresentationScript | null>(null);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '' });
  const [sendEmail, setSendEmail] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);

  const IconComponent = topic && topicIconMap[topic] ? topicIconMap[topic] : Mic;

  // Load script when modal opens with topic
  useEffect(() => {
    if (isOpen && topic) {
      loadScriptAndAudio();
    } else {
      // Reset state when closed
      setScript(null);
      setAudioUrl(null);
      setProgress(0);
      setCurrentTime(0);
      setShowLeadForm(false);
      setIsPlaying(false);
      setLeadData({ name: '', email: '', phone: '' });
      setSendEmail(false);
      setSendWhatsApp(false);
    }
  }, [isOpen, topic]);

  const loadScriptAndAudio = async () => {
    if (!topic) return;
    
    setIsLoading(true);
    try {
      // Buscar script via edge function
      const { data: scriptResponse, error: scriptError } = await supabase.functions.invoke(
        'get-presentation-script',
        { body: { topic } }
      );

      if (scriptError || !scriptResponse?.success) {
        throw new Error(scriptResponse?.error || 'Falha ao carregar script');
      }

      setScript(scriptResponse.data);
      startTimeRef.current = Date.now();

      // Gerar áudio via TTS usando fetch direto para receber bytes corretamente
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              text: scriptResponse.data.audio_script,
              voice: 'nova'
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`TTS error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      } catch (audioError) {
        console.error('Erro ao gerar áudio:', audioError);
        // Continua sem áudio - mostra apenas texto
      }
    } catch (error) {
      console.error('Erro ao carregar apresentação:', error);
      toast.error('Não foi possível carregar a apresentação');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime: time, duration } = audioRef.current;
    setCurrentTime(time);
    if (duration > 0) {
      setProgress((time / duration) * 100);
      setAudioDuration(Math.floor(duration));
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setProgress(100);
    setShowLeadForm(true);
  };

  const validateForm = () => {
    if (!leadData.name.trim()) {
      toast.error('Nome é obrigatório');
      return false;
    }
    
    if (leadData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
      toast.error('Email inválido');
      return false;
    }
    
    if (leadData.phone && leadData.phone.replace(/\D/g, '').length < 10) {
      toast.error('Telefone inválido');
      return false;
    }

    if (sendEmail && !leadData.email) {
      toast.error('Preencha o email para receber o resumo');
      return false;
    }

    if (sendWhatsApp && !leadData.phone) {
      toast.error('Preencha o telefone para receber o resumo');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      const { data, error } = await supabase.functions.invoke('capture-dataflow-lead', {
        body: {
          salesmanId,
          leadName: leadData.name.trim(),
          leadEmail: leadData.email.trim() || null,
          leadPhone: leadData.phone.replace(/\D/g, '') || null,
          presentationTopic: topic,
          durationSeconds,
          sendSummaryEmail: sendEmail && !!leadData.email,
          sendSummaryWhatsApp: sendWhatsApp && !!leadData.phone,
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Falha ao salvar');
      }

      toast.success('Obrigado pelo seu interesse!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      toast.error('Erro ao finalizar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setLeadData(prev => ({ ...prev, phone: formatted }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full h-full max-w-full max-h-full rounded-none sm:max-w-lg sm:h-auto sm:max-h-[90vh] sm:rounded-lg overflow-y-auto">
        <DialogHeader className="relative">
          <button
            onClick={onClose}
            className="absolute right-0 top-0 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <IconComponent className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                🎤 Alex - Seu Guia KnowYOU
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Carregando...' : script?.title || 'Apresentação'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-red-500" />
              <p className="mt-4 text-muted-foreground">Preparando apresentação...</p>
            </div>
          ) : showLeadForm ? (
            // Formulário de Lead
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center">
                Gostou? Deixe seu contato!
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="lead-name">Nome *</Label>
                  <Input
                    id="lead-name"
                    placeholder="Seu nome"
                    value={leadData.name}
                    onChange={(e) => setLeadData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="lead-email">Email</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={leadData.email}
                    onChange={(e) => setLeadData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="lead-phone">Telefone</Label>
                  <Input
                    id="lead-phone"
                    placeholder="(11) 99999-9999"
                    value={leadData.phone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-email"
                    checked={sendEmail}
                    onCheckedChange={(checked) => setSendEmail(!!checked)}
                    disabled={!leadData.email}
                  />
                  <Label htmlFor="send-email" className="text-sm cursor-pointer">
                    Enviar resumo por email
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-whatsapp"
                    checked={sendWhatsApp}
                    onCheckedChange={(checked) => setSendWhatsApp(!!checked)}
                    disabled={!leadData.phone}
                  />
                  <Label htmlFor="send-whatsapp" className="text-sm cursor-pointer">
                    Enviar resumo por WhatsApp
                  </Label>
                </div>
              </div>
              
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-red-500 hover:bg-red-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Finalizar'
                )}
              </Button>
            </div>
          ) : (
            // Player de Áudio
            <div className="space-y-4">
              {/* Texto do script */}
              <div className="max-h-64 overflow-y-auto p-4 bg-muted/50 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {script?.audio_script || 'Carregando...'}
                </p>
              </div>
              
              {/* Barra de progresso */}
              <Progress value={progress} className="h-2" />
              
              {/* Tempo atual / total */}
              <p className="text-sm text-muted-foreground text-center">
                {formatTime(currentTime)} / {formatTime(audioDuration)}
              </p>
              
              {/* Controles */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={togglePlayPause}
                  variant="outline"
                  size="lg"
                  className="rounded-full w-14 h-14"
                  disabled={!audioUrl}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </Button>
              </div>
              
              {!audioUrl && (
                <p className="text-center text-sm text-muted-foreground">
                  Áudio não disponível. Leia o texto acima.
                </p>
              )}
              
              <Button
                variant="ghost"
                onClick={() => setShowLeadForm(true)}
                className="w-full text-muted-foreground"
              >
                Pular para o formulário →
              </Button>
            </div>
          )}
        </div>

        {/* Audio element (hidden) */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
