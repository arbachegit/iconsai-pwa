import { useEffect, useRef, useState, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatKnowYOU, type Message } from "@/hooks/useChatKnowYOU";
import { Loader2, ImagePlus, Mic, Square, X, ArrowUp, BarChart3, ArrowDown, Paperclip, Upload } from "lucide-react";
import { AudioControls } from "./AudioControls";
import { useToast } from "@/hooks/use-toast";
import { MarkdownContent } from "./MarkdownContent";
import { TypingIndicator } from "./TypingIndicator";
import knowriskLogo from "@/assets/knowrisk-logo-circular.png";
import { useTranslation } from "react-i18next";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { CopyButton } from "./CopyButton";
import { ChatFloatingAudioPlayer } from "./ChatFloatingAudioPlayer";
import { cn } from "@/lib/utils";
import ContextualSuggestions from "./ContextualSuggestions";
import { useGeolocation } from "@/hooks/useGeolocation";
import { mapCityToRegion, getRegionDisplayName, getRegionToneLabel } from "@/lib/region-mapping";
import FileProcessor from "@/components/chat/FileProcessor";
import { DataVisualization } from "@/components/chat/DataVisualization";
import { supabase } from "@/integrations/supabase/client";

// Memoizado para evitar re-renders durante digitação  
const SentimentIndicator = memo(({
  sentiment
}: {
  sentiment: {
    label: string;
    score: number;
  } | null;
}) => {
  if (!sentiment) return null;
  const emoji = {
    positive: "😊",
    neutral: "😐",
    negative: "😟"
  };
  const color = {
    positive: "text-green-500",
    neutral: "text-yellow-500",
    negative: "text-red-500"
  };
  return <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-background/50 backdrop-blur-sm ${color[sentiment.label as keyof typeof color]}`}>
      <span className="text-lg">{emoji[sentiment.label as keyof typeof emoji]}</span>
      <span className="text-xs font-medium">{(sentiment.score * 100).toFixed(0)}%</span>
    </div>;
});
export default function ChatKnowYOU() {
  const {
    t
  } = useTranslation();
  const {
    toast
  } = useToast();
  const {
    location,
    requestLocation
  } = useGeolocation();
  
  // Mapear cidade para região cultural
  const userRegion = mapCityToRegion(location);
  
  const {
    messages,
    isLoading,
    isGeneratingAudio,
    isGeneratingImage,
    currentlyPlayingIndex,
    suggestions,
    currentSentiment,
    activeDisclaimer,
    attachedDocumentId,
    audioProgress,
    sendMessage,
    clearHistory,
    playAudio,
    stopAudio,
    generateImage,
    transcribeAudio,
    attachDocument,
    detachDocument,
    addMessage
  } = useChatKnowYOU({ userRegion });
  const [input, setInput] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const [isImageMode, setIsImageMode] = useState(false);
  const [isChartMode, setIsChartMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'waiting' | 'processing'>('idle');
  const [waitingCountdown, setWaitingCountdown] = useState(5);
  
  // File upload states
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [agentCapabilities, setAgentCapabilities] = useState<Record<string, boolean>>({});
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<string>("");
  const prefixTextRef = useRef<string>("");
  const mountTimeRef = useRef(Date.now());
  const previousMessagesLength = useRef(messages.length);
  const INIT_PERIOD = 1000; // 1 segundo de período de inicialização
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [audioVisibility, setAudioVisibility] = useState<{
    [key: number]: boolean;
  }>({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const audioMessageRefs = useRef<{
    [key: number]: HTMLDivElement | null;
  }>({});

  // 🔒 useCallback para não causar re-render do ContextualSuggestions
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
  }, []);

  // lastAssistantMessage removido - sugestões vêm 100% do LLM

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Agent capabilities - using metadata field since capabilities column doesn't exist
  useEffect(() => {
    const fetchAgentCapabilities = async () => {
      const { data } = await supabase
        .from("chat_agents")
        .select("metadata")
        .eq("name", "health")
        .single();
      
      if (data?.metadata && typeof data.metadata === 'object') {
        const meta = data.metadata as Record<string, unknown>;
        if (meta.capabilities && typeof meta.capabilities === 'object') {
          setAgentCapabilities(meta.capabilities as Record<string, boolean>);
        }
      }
    };
    fetchAgentCapabilities();
  }, []);

  // File upload handlers
  const handleFileLoaded = useCallback((data: any[], fileName: string, columns: string[]) => {
    setIsFileDialogOpen(false);
    
    const numericCols = columns.filter(col => 
      data.some(row => !isNaN(Number(row[col])))
    );
    
    // Pass fileData directly with sendMessage - this ensures data reaches the Edge Function
    sendMessage(
      `Arquivo enviado: ${fileName} com ${data.length} registros e ${columns.length} colunas. Colunas numéricas: ${numericCols.join(", ")}. Por favor, analise os dados.`,
      { fileData: { data, fileName, columns } }
    );
  }, [sendMessage]);

  const processFile = useCallback((file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    
    if (extension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          handleFileLoaded(results.data as any[], file.name, results.meta.fields || []);
        },
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        handleFileLoaded(data, file.name, columns);
      };
      reader.readAsArrayBuffer(file);
    }
  }, [handleFileLoaded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (agentCapabilities.file_upload) {
      setIsDraggingFile(true);
    }
  }, [agentCapabilities]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (["csv", "xlsx", "xls"].includes(ext || "")) {
      processFile(file);
    } else {
      toast({
        title: "Formato não suportado",
        description: "Use arquivos .csv, .xlsx ou .xls",
        variant: "destructive"
      });
    }
  }, [processFile, toast]);

  // Capturar o viewport do ScrollArea após mount
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        scrollViewportRef.current = viewport as HTMLDivElement;
      }
    }
  }, []);

  // Auditoria de digitação removida - causava overhead no useEffect a cada keystroke

  // IntersectionObserver para detectar quando mensagem de áudio sai do viewport
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const idx = Number(entry.target.getAttribute('data-audio-index'));
        if (!isNaN(idx)) {
          setAudioVisibility(prev => ({
            ...prev,
            [idx]: entry.isIntersecting
          }));
        }
      });
    }, {
      threshold: 0.1
    });
    Object.entries(audioMessageRefs.current).forEach(([idx, el]) => {
      if (el) {
        el.setAttribute('data-audio-index', idx);
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, [messages]);

  // Mostrar FloatingPlayer quando áudio tocando E não visível
  useEffect(() => {
    if (currentlyPlayingIndex !== null && !audioVisibility[currentlyPlayingIndex]) {
      setShowFloatingPlayer(true);
    } else {
      setShowFloatingPlayer(false);
    }
  }, [currentlyPlayingIndex, audioVisibility]);

  // Detectar quando usuário não está no final do scroll
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };
    
    viewport.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [messages.length]);


  // Helper function to scroll to bottom
  const scrollToBottom = () => {
    if (scrollViewportRef.current) {
      requestAnimationFrame(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
  };

  // Auto-scroll to latest message - SOLUÇÃO DEFINITIVA
  useEffect(() => {
    // Ignorar scrolls durante o período de inicialização
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (timeSinceMount < INIT_PERIOD) {
      previousMessagesLength.current = messages.length;
      return;
    }

    // Scroll quando há nova mensagem OU quando está carregando (streaming)
    const shouldScroll = messages.length > previousMessagesLength.current || isLoading;
    if (shouldScroll && scrollViewportRef.current) {
      requestAnimationFrame(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
    previousMessagesLength.current = messages.length;
  }, [messages, isLoading]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parar gravação explicitamente ao enviar mensagem
    if (isRecording) {
      stopRecording();
    }
    
    if (input.trim() && !isLoading) {
      if (isImageMode) {
        generateImage(input);
        setInput("");
        setIsImageMode(false);
      } else {
        sendMessage(input);
        setInput("");
      }
      // Scroll imediato após enviar
      setTimeout(scrollToBottom, 100);
    }
  };
  const toggleImageMode = () => {
    setIsImageMode(!isImageMode);
    setIsChartMode(false);
    setInput("");
  };

  const toggleChartMode = () => {
    setIsChartMode(!isChartMode);
    setIsImageMode(false);
    setInput("");
  };
  
  const startRecording = async () => {
    try {
      // Tentar usar Web Speech API para transcrição em tempo real
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;
        let silenceTimeout: NodeJS.Timeout | null = null;
        const SILENCE_TIMEOUT = 5000; // 5 segundos

        recognition.onstart = () => {
          prefixTextRef.current = input; // Salvar texto que existia antes
          setIsRecording(true);
          setIsTranscribing(true);
          setVoiceStatus('listening');
        };
        recognition.onresult = (event: any) => {
          let fullTranscript = '';

          // Reconstruir TODO o texto a partir de TODOS os resultados
          // NÃO usar inputRef.current aqui para evitar duplicação!
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            fullTranscript += result[0].transcript;
            if (result.isFinal) {
              fullTranscript += ' ';
            }
          }

          // Concatenar com texto que existia ANTES da gravação (modo append)
          const prefix = prefixTextRef.current;
          const separator = prefix && !prefix.endsWith(' ') ? ' ' : '';
          setInput(prefix + separator + fullTranscript.trim());
        };
        recognition.onspeechend = () => {
          // Clear any existing timers
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          setVoiceStatus('waiting');
          setWaitingCountdown(5);

          // Countdown interval - store in ref
          countdownIntervalRef.current = setInterval(() => {
            setWaitingCountdown(prev => {
              if (prev <= 1) {
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          // Silence timeout - store in ref
          silenceTimeoutRef.current = setTimeout(() => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            recognition.stop();
          }, SILENCE_TIMEOUT);
        };
        recognition.onspeechstart = () => {
          // Clear BOTH timeout and interval when speech resumes
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setVoiceStatus('listening');
          setWaitingCountdown(5); // Reset countdown
        };
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // Cleanup all timers
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setIsRecording(false);
          setIsTranscribing(false);
          setVoiceStatus('idle');

          // Fallback para gravação com Whisper se Web Speech API falhar
          toast({
            title: t('chat.speechNotAvailable'),
            description: t('chat.speechFallback')
          });
          startRecordingWithWhisper();
        };
        recognition.onend = () => {
          // Cleanup all timers
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          prefixTextRef.current = ""; // Limpar para próxima gravação
          setIsRecording(false);
          setIsTranscribing(false);
          setVoiceStatus('idle');
        };
        mediaRecorderRef.current = recognition as any;
        recognition.start();
      } else {
        // Fallback: usar gravação com Whisper
        startRecordingWithWhisper();
      }
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast({
        title: t('chat.micError'),
        description: t('chat.micPermissions'),
        variant: "destructive"
      });
    }
  };
  const startRecordingWithWhisper = async () => {
    try {
      prefixTextRef.current = input; // Salvar texto existente
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Setup AudioContext for silence detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 2048;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart: number | null = null;
      let animationFrameId: number;
      const checkSilence = () => {
        if (!isRecording) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average < 10) {
          // Silence threshold
          if (!silenceStart) {
            silenceStart = Date.now();
            setVoiceStatus('waiting');
          } else if (Date.now() - silenceStart > 5000) {
            // 5 seconds of silence - stop recording
            mediaRecorder.stop();
            cancelAnimationFrame(animationFrameId);
            return;
          }
          // Update countdown
          const elapsed = Math.floor((Date.now() - silenceStart) / 1000);
          setWaitingCountdown(Math.max(0, 5 - elapsed));
        } else {
          silenceStart = null;
          setVoiceStatus('listening');
          setWaitingCountdown(5);
        }
        animationFrameId = requestAnimationFrame(checkSilence);
      };
      mediaRecorder.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        cancelAnimationFrame(animationFrameId);
        audioContext.close();
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm'
        });
        audioChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());

        // Transcribe audio using Whisper API
        setIsTranscribing(true);
        setVoiceStatus('processing');
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          // MODO ANEXO: concatenar com texto pré-existente
          const prefix = prefixTextRef.current;
          const separator = prefix && !prefix.endsWith(' ') ? ' ' : '';
          setInput(prefix + separator + transcribedText.trim());
          prefixTextRef.current = ""; // Limpar após uso
        } catch (error) {
          console.error('Error transcribing audio:', error);
          toast({
            title: t('chat.transcriptionError'),
            description: t('chat.transcriptionRetry'),
            variant: "destructive"
          });
        } finally {
          setIsTranscribing(false);
          setVoiceStatus('idle');
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setVoiceStatus('listening');
      checkSilence(); // Start silence detection
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast({
        title: t('chat.micError'),
        description: t('chat.micPermissions'),
        variant: "destructive"
      });
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Check if it's Web Speech API or MediaRecorder
      if (mediaRecorderRef.current.stop) {
        mediaRecorderRef.current.stop();
      }
      if ((mediaRecorderRef.current as any).abort) {
        (mediaRecorderRef.current as any).abort();
      }
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  // Listen for global stop audio event
  useEffect(() => {
    const handleStopAll = () => stopAudio();
    window.addEventListener('stopAllAudio', handleStopAll);
    return () => window.removeEventListener('stopAllAudio', handleStopAll);
  }, [stopAudio]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleAudioPlay = (index: number) => {
    playAudio(index);
  };

  const handleAudioStop = () => {
    stopAudio();
  };

  const handleDownloadAudio = (audioUrl: string, messageIndex: number) => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `knowyou-saude-audio-${messageIndex}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadImage = (imageUrl: string, messageIndex: number) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `knowyou-saude-imagem-${messageIndex}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm rounded-lg border-2 border-primary/40 shadow-[0_0_15px_rgba(139,92,246,0.2),0_0_30px_rgba(139,92,246,0.1)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-primary/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={knowriskLogo} alt="KnowRisk Logo" className="w-10 h-10" />
            
            {/* Online indicator - single animation for performance */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 z-10" />
              <div className="absolute w-4 h-4 rounded-full bg-green-500/20 animate-ping" />
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gradient">{t('chat.healthTitle')}</h2>
            {/* Region Badge */}
            {location && userRegion !== "default" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{getRegionDisplayName(userRegion)} - {getRegionToneLabel(userRegion)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SentimentIndicator sentiment={currentSentiment} />
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs">
            {t('chat.clear')}
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ScrollArea className="h-[500px] p-6 border-2 border-cyan-400/60 bg-[hsl(var(--chat-container-bg))] rounded-lg mx-2 mt-2 mb-1 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_3px_rgba(0,0,0,0.3),0_0_15px_rgba(34,211,238,0.3)]" ref={scrollRef}>
        
        {/* Drag overlay */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 border-2 border-dashed border-cyan-400 rounded-lg m-2">
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto text-cyan-400 mb-2" />
              <p className="text-cyan-300 font-medium">Solte o arquivo aqui</p>
              <p className="text-xs text-muted-foreground">.csv, .xlsx, .xls</p>
            </div>
          </div>
        )}
          {messages.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                <span className="text-4xl font-bold text-primary-foreground">K</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">{t('chat.greeting')}</h4>
              <p className="text-muted-foreground max-w-md">
                {t('chat.greetingDesc')}
              </p>
            </div> : <div className="space-y-4 overflow-x-auto">
              {/* Disclaimer when document is attached */}
              {activeDisclaimer && <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="flex items-center justify-between">
                    {t('documentAttach.disclaimerTitle')}
                    <Button variant="ghost" size="sm" onClick={detachDocument} className="h-6 w-6 p-0" title={t('documentAttach.removeButton')}>
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertTitle>
                  <AlertDescription>
                    {activeDisclaimer.message}
                  </AlertDescription>
                </Alert>}
              
              {messages.map((msg, idx) => <div key={idx} className={cn(
                "flex items-end gap-1",
                msg.type === "file-data" ? "w-full" : (msg.role === "user" ? "justify-end" : "justify-start")
              )} ref={el => {
            if (msg.role === "assistant" && msg.audioUrl) {
              audioMessageRefs.current[idx] = el;
            }
          }}>
                  {msg.role === "user" && <CopyButton content={msg.content} />}
                  <div className={cn(
                    "rounded-2xl px-4 py-3 overflow-hidden",
                    msg.type === "file-data" ? "w-[80%] max-w-[80%]" : "max-w-[80%]",
                    msg.role === "user"
                      ? "bg-[hsl(var(--chat-message-user-bg))] text-primary-foreground text-right" 
                      : "bg-[hsl(var(--chat-message-ai-bg))] text-foreground text-left"
                  )}>
                    {/* Render DataVisualization for file-data messages */}
                    {msg.type === "file-data" && msg.fileData && (
                      <DataVisualization 
                        data={msg.fileData.data}
                        columns={msg.fileData.columns}
                        fileName={msg.fileData.fileName}
                      />
                    )}
                    {msg.imageUrl && <img src={msg.imageUrl} alt={t('chat.generatingImage')} className="max-w-full rounded-lg mb-2" />}
                          <MarkdownContent content={msg.content} />
                    
                    {msg.role === "assistant" && <AudioControls audioUrl={msg.audioUrl} imageUrl={msg.imageUrl} isPlaying={currentlyPlayingIndex === idx} isGeneratingAudio={isGeneratingAudio} currentTime={currentlyPlayingIndex === idx ? audioProgress.currentTime : 0} duration={currentlyPlayingIndex === idx ? audioProgress.duration : 0} timestamp={msg.timestamp} location={location || undefined} messageContent={msg.content} onPlay={() => handleAudioPlay(idx)} onStop={handleAudioStop} onDownload={msg.audioUrl ? () => handleDownloadAudio(msg.audioUrl!, idx) : undefined} onDownloadImage={msg.imageUrl ? () => handleDownloadImage(msg.imageUrl!, idx) : undefined} />}
                  </div>
                </div>)}
                {(isLoading || isGeneratingAudio || isGeneratingImage) && <div className="flex justify-start">
                    <TypingIndicator isDrawing={isGeneratingImage} />
                  </div>}
              <div ref={messagesEndRef} />
            </div>}
        </ScrollArea>
        
        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 
                       h-10 w-10 rounded-full bg-white text-black 
                       shadow-lg hover:shadow-xl 
                       flex items-center justify-center
                       transition-all duration-300 hover:scale-110"
            style={{ animation: 'bounce-gentle 1.5s infinite' }}
            aria-label="Rolar até o final"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Contextual Suggestions - ACIMA do input */}
      {!isLoading && suggestions.length > 0 && (
        <ContextualSuggestions
          suggestions={suggestions}
          isLoading={isLoading}
          onSuggestionClick={handleSuggestionClick}
        />
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="pb-0 px-6">
        {/* Indicador de voz ativo */}
        {isRecording && <div className="flex items-center gap-2 text-xs mb-2">
            <div className={`w-2 h-2 rounded-full ${voiceStatus === 'waiting' ? 'bg-amber-500' : voiceStatus === 'processing' ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`} />
            <span className={voiceStatus === 'waiting' ? 'text-amber-500' : 'text-muted-foreground'}>
              {voiceStatus === 'listening' && t('chat.listening')}
              {voiceStatus === 'waiting' && `${t('chat.waiting')} (${waitingCountdown}s)`}
              {voiceStatus === 'processing' && t('chat.processing')}
            </span>
          </div>}
        
          <div className="relative">
            <Textarea value={input} onChange={e => {
          const newValue = e.target.value;
          inputRef.current = newValue; // Sync direto sem useEffect
          setInput(newValue);
        }} onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }} placeholder={isTranscribing ? t('chat.transcribing') : isImageMode ? t('chat.placeholderImage') : isChartMode ? "Descreva os dados para gerar um gráfico..." : t('chat.placeholderHealth')} onFocus={e => {
          if (isImageMode) {
            e.target.placeholder = t('chat.imageLimitHealth');
          }
        }} onBlur={e => {
          if (isImageMode) {
            e.target.placeholder = t('chat.placeholderImage');
          }
        }} className="min-h-[34px] resize-none w-full pb-12 pr-12 border-2 border-cyan-400/60 shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),0_0_10px_rgba(34,211,238,0.2)]" disabled={isLoading || isTranscribing} />
          
            {/* Esquerda: Mic + Draw lado a lado */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              <Button type="button" size="icon" variant="ghost" onClick={isRecording ? stopRecording : startRecording} className={`h-9 w-9 shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow ${isRecording ? "text-red-500 bg-red-500/10" : ""}`}>
                {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              
              <Button type="button" size="icon" variant={isImageMode ? "default" : "ghost"} onClick={toggleImageMode} disabled={isGeneratingImage} title="Desenhar" className="h-9 w-9 shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow">
                <ImagePlus className="w-4 h-4" />
              </Button>
              
              <Button type="button" size="icon" variant={isChartMode ? "default" : "ghost"} onClick={toggleChartMode} title="Gráfico" className="h-9 w-9 shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow">
                <BarChart3 className="w-4 h-4" />
              </Button>
              
              {/* File upload button - only if capability enabled */}
              {agentCapabilities.file_upload && (
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost"
                  onClick={() => setIsFileDialogOpen(true)}
                  title="Enviar Arquivo"
                  className="h-9 w-9 shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Direita: Input (círculo) */}
            <Button type="submit" size="icon" disabled={!input.trim() && !isLoading} className="absolute bottom-2 right-2 rounded-full h-9 w-9 bg-primary hover:bg-primary/90 shadow-[0_3px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_5px_12px_rgba(0,0,0,0.3)] transition-shadow">
              {isLoading ? <Square className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            </Button>
          </div>
        <p className="text-xs leading-none text-muted-foreground mt-2 mb-1 text-center">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
      </form>
      
      {/* Floating Audio Player */}
      <ChatFloatingAudioPlayer 
        isVisible={showFloatingPlayer && currentlyPlayingIndex !== null} 
        currentTime={audioProgress.currentTime} 
        duration={audioProgress.duration} 
        onStop={() => {
          stopAudio();
          setShowFloatingPlayer(false);
        }} 
        onClose={() => {
          stopAudio();
          setShowFloatingPlayer(false);
        }} 
      />

      {/* File Upload Dialog */}
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">Enviar Arquivo</DialogTitle>
          </DialogHeader>
          <FileProcessor onDataLoaded={handleFileLoaded} />
        </DialogContent>
      </Dialog>
    </div>;
}