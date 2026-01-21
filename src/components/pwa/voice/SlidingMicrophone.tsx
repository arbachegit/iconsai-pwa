/**
 * ============================================================
 * SlidingMicrophone.tsx - Microfone com Animação Slide-Up
 * ============================================================
 * Versão: 1.1.0
 * Data: 2026-01-05
 * 
 * CORREÇÃO: Bug crítico na linha 213 - mimeType vazio
 * FIX: Usar mimeTypeRef.current ao invés de mimeType local
 * 
 * Descrição: Componente de microfone que surge de baixo para cima,
 * captura áudio e envia para transcrição via Whisper.
 * ============================================================
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hapticMedium, hapticSuccess } from "@/utils/haptics";

// Estados do microfone
export type MicrophoneState = "hidden" | "ready" | "recording" | "processing" | "error";

interface SlidingMicrophoneProps {
  /** Se o microfone está visível */
  isVisible: boolean;
  /** Callback quando captura áudio (retorna o Blob) */
  onAudioCapture: (audioBlob: Blob) => void;
  /** Callback quando transcrição está pronta */
  onTranscription?: (text: string) => void;
  /** Callback quando fecha o microfone */
  onClose: () => void;
  /** Callback quando inicia gravação */
  onRecordingStart?: () => void;
  /** Callback quando para gravação */
  onRecordingStop?: () => void;
  /** Callback com dados de frequência em tempo real para visualização */
  onFrequencyData?: (data: number[]) => void;
  /** Duração máxima em segundos */
  maxDuration?: number;
  /** Se deve enviar para transcrição automaticamente */
  autoTranscribe?: boolean;
  /** Cor primária */
  primaryColor?: string;
  /** Classe CSS adicional */
  className?: string;
}

export const SlidingMicrophone: React.FC<SlidingMicrophoneProps> = ({
  isVisible,
  onAudioCapture,
  onTranscription,
  onClose,
  onRecordingStart,
  onRecordingStop,
  onFrequencyData,
  maxDuration = 60,
  autoTranscribe = true,
  primaryColor = "#EF4444",
  className = "",
}) => {
  // Estados
  const [state, setState] = useState<MicrophoneState>("hidden");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");

  // Limpar recursos
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyzerRef.current = null;
    audioChunksRef.current = [];
  }, []);

  // Atualizar estado quando visibilidade muda
  useEffect(() => {
    if (isVisible) {
      setState("ready");
      setRecordingTime(0);
      setErrorMessage(null);
    } else {
      cleanup();
      setState("hidden");
    }
  }, [isVisible, cleanup]);

  // Analisar nível de áudio em tempo real
  const startAudioAnalysis = useCallback(() => {
    if (!analyzerRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);

    const analyze = () => {
      if (!analyzerRef.current) return;
      
      analyzerRef.current.getByteFrequencyData(dataArray);
      
      // Calcular média do nível de áudio
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
      
      // Enviar dados de frequência para o pai (para SpectrumAnalyzer)
      if (onFrequencyData) {
        onFrequencyData(Array.from(dataArray));
      }
      
      animationRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, [onFrequencyData]);

  // Transcrever áudio usando edge function existente
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    // Converter blob para base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    const { data, error } = await supabase.functions.invoke("voice-to-text", {
      body: { audio: base64, mimeType: mimeTypeRef.current },
    });

    if (error) {
      throw new Error(error.message || "Falha na transcrição");
    }

    return data?.text || "";
  };

  // Iniciar gravação
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      
      // Solicitar permissão do microfone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });
      
      streamRef.current = stream;

      // Configurar Web Audio API para análise
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      source.connect(analyzerRef.current);

      // Detectar plataforma para escolher mimeType ideal
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      let mimeType: string;
      
      if (isIOS || isSafari) {
        // iOS/Safari preferem mp4
        mimeType = MediaRecorder.isTypeSupported("audio/mp4") 
          ? "audio/mp4" 
          : MediaRecorder.isTypeSupported("audio/webm") 
            ? "audio/webm" 
            : "";
      } else {
        // Chrome/Firefox/Android preferem webm
        mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : MediaRecorder.isTypeSupported("audio/mp4")
              ? "audio/mp4"
              : "";
      }
      
      console.log("[SlidingMicrophone] Plataforma:", isIOS ? "iOS" : isSafari ? "Safari" : "Other");
      console.log("[SlidingMicrophone] mimeType selecionado:", mimeType || "default");

      // IMPORTANTE: Salvar na ref ANTES de usar
      mimeTypeRef.current = mimeType || "audio/webm";
      
      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log("[SlidingMicrophone] Chunk recebido:", event.data.size, "bytes");
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // CORREÇÃO CRÍTICA: Usar mimeTypeRef.current ao invés de mimeType local
        // A variável local mimeType pode estar vazia ou inacessível no callback
        const finalMimeType = mimeTypeRef.current;
        console.log("[SlidingMicrophone] onstop - usando mimeType:", finalMimeType);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        console.log("[SlidingMicrophone] Blob criado:", {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length
        });
        
        onAudioCapture(audioBlob);

        // Enviar para transcrição se habilitado
        if (autoTranscribe && onTranscription) {
          setState("processing");
          try {
            const transcription = await transcribeAudio(audioBlob);
            onTranscription(transcription);
          } catch (error) {
            console.error("Erro na transcrição:", error);
            setErrorMessage("Erro ao transcrever áudio");
          }
        }

        cleanup();
        setState("ready");
        setRecordingTime(0);
      };

      // Iniciar gravação com timeslice para coleta regular de chunks
      mediaRecorderRef.current.start(1000);
      setState("recording");
      hapticMedium();
      onRecordingStart?.();

      // Iniciar análise de áudio
      startAudioAnalysis();

      // Timer de contagem
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (error: any) {
      console.error("Erro ao iniciar gravação:", error);
      
      if (error.name === "NotAllowedError") {
        setErrorMessage("Permissão de microfone negada");
      } else if (error.name === "NotFoundError") {
        setErrorMessage("Microfone não encontrado");
      } else {
        setErrorMessage("Erro ao acessar microfone");
      }
      
      setState("error");
    }
  };

  // Parar gravação
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      hapticSuccess();
      onRecordingStop?.();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [onRecordingStop]);

  // Cancelar gravação
  const cancelRecording = useCallback(() => {
    cleanup();
    setState("ready");
    setRecordingTime(0);
    onClose();
  }, [cleanup, onClose]);

  // Formatar tempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Renderizar ondas de áudio durante gravação
  const renderAudioWaves = () => {
    const waveCount = 5;
    return (
      <div className="flex items-center justify-center gap-1 h-12">
        {Array.from({ length: waveCount }).map((_, i) => (
          <motion.div
            key={i}
            className="w-1 rounded-full"
            style={{ backgroundColor: primaryColor }}
            animate={{
              height: [8, 8 + audioLevel * 32 * (1 + Math.sin(i)), 8],
            }}
            transition={{
              duration: 0.15,
              repeat: Infinity,
              delay: i * 0.05,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`absolute bottom-0 left-0 right-0 z-50 ${className}`}
        >
          {/* Fundo com blur */}
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10 shadow-2xl">
            {/* Handle de arraste (visual) */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Conteúdo principal */}
            <div className="px-6 pb-8 min-h-[240px] flex flex-col items-center justify-center">
              {/* Estado: Ready */}
              {state === "ready" && (
                <div className="flex flex-col items-center gap-6">
                  <p className="text-white/60 text-sm">
                    Toque para gravar sua mensagem
                  </p>
                  
                  {/* Botão de gravar */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startRecording}
                    className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -30)})`,
                    }}
                  >
                    <Mic className="w-10 h-10 text-white" />
                  </motion.button>

                  {/* Botão fechar */}
                  <button
                    onClick={onClose}
                    className="flex items-center gap-2 text-white/50 hover:text-white/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              )}

              {/* Estado: Recording */}
              {state === "recording" && (
                <div className="flex flex-col items-center gap-4 w-full">
                  {/* Timer */}
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <span className="text-white text-2xl font-mono">
                      {formatTime(recordingTime)}
                    </span>
                    <span className="text-white/40 text-lg font-mono">
                      / {formatTime(maxDuration)}
                    </span>
                  </div>

                  {/* Ondas de áudio */}
                  {renderAudioWaves()}

                  {/* Barra de progresso */}
                  <div className="w-full max-w-xs h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: primaryColor }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${(recordingTime / maxDuration) * 100}%` }}
                    />
                  </div>

                  {/* Botões de ação */}
                  <div className="flex items-center gap-8 mt-4">
                    {/* Cancelar */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={cancelRecording}
                      className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <X className="w-6 h-6 text-white/70" />
                    </motion.button>

                    {/* Parar e enviar */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={stopRecording}
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -30)})`,
                      }}
                    >
                      <Square className="w-7 h-7 text-white" fill="white" />
                    </motion.button>
                  </div>

                  <p className="text-white/40 text-xs mt-2">
                    Toque no quadrado para enviar
                  </p>
                </div>
              )}

              {/* Estado: Processing */}
              {state === "processing" && (
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-12 h-12 text-blue-400" />
                  </motion.div>
                  <p className="text-white/60">Processando áudio...</p>
                </div>
              )}

              {/* Estado: Error */}
              {state === "error" && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                    <MicOff className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-red-400 text-center">
                    {errorMessage || "Erro ao acessar microfone"}
                  </p>
                  <button
                    onClick={() => setState("ready")}
                    className="px-4 py-2 bg-white/10 rounded-lg text-white/70 hover:bg-white/20"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>

            {/* Safe area para iOS */}
            <div className="h-safe-area-inset-bottom" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Função auxiliar para ajustar cor
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default SlidingMicrophone;
