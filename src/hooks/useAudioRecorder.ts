/**
 * ============================================================
 * hooks/useAudioRecorder.ts
 * ============================================================
 * Versão: 2.0.0 - 2026-01-10
 * SAFARI COMPATIBLE
 * Hook para gravação de áudio com MediaRecorder
 * ============================================================
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { blobToBase64, validateAudioBlob } from "@/utils/audio";
import { getBrowserInfo, BrowserInfo } from "@/utils/safari-detect";
import { 
  getSupportedRecordingMimeType, 
  getOptimizedAudioConstraints,
  getAudioContext,
  unlockAudio 
} from "@/utils/safari-audio";

export type RecordingState = "idle" | "recording" | "processing" | "error";

interface UseAudioRecorderOptions {
  minDuration?: number;
  maxDuration?: number;
  minSizeKB?: number;
  onRecordingStart?: () => void;
  onRecordingStop?: (blob: Blob, duration: number) => void;
  onError?: (error: string) => void;
  onFrequencyData?: (data: number[]) => void;
}

interface UseAudioRecorderReturn {
  state: RecordingState;
  duration: number;
  audioBlob: Blob | null;
  audioBase64: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  reset: () => void;
  browserInfo: BrowserInfo;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const { 
    minDuration = 0.5, 
    maxDuration = 120, 
    minSizeKB = 1, 
    onRecordingStart, 
    onRecordingStop, 
    onError,
    onFrequencyData 
  } = options;

  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>("");
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const browserInfo = getBrowserInfo();

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
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyzerRef.current = null;
    chunksRef.current = [];
  }, []);

  // Análise de frequência para visualizador
  const startFrequencyAnalysis = useCallback(() => {
    if (!analyzerRef.current || !onFrequencyData) return;
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    
    const analyze = () => {
      if (!analyzerRef.current) return;
      analyzerRef.current.getByteFrequencyData(dataArray);
      onFrequencyData(Array.from(dataArray));
      animationRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  }, [onFrequencyData]);

  const startRecording = useCallback(async () => {
    try {
      cleanup();
      setState("recording");
      setDuration(0);
      setAudioBlob(null);
      setAudioBase64(null);

      // Safari: desbloquear áudio primeiro
      if (browserInfo.isSafari || browserInfo.isIOS) {
        await unlockAudio();
      }

      // Obter constraints otimizadas para a plataforma
      const audioConstraints = getOptimizedAudioConstraints();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      streamRef.current = stream;

      // Configurar analisador de frequência
      try {
        const audioContext = getAudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        const source = audioContext.createMediaStreamSource(stream);
        analyzerRef.current = audioContext.createAnalyser();
        analyzerRef.current.fftSize = 256;
        source.connect(analyzerRef.current);
      } catch (e) {
        console.warn('[AudioRecorder] Could not setup analyzer:', e);
      }

      // Obter mimeType suportado pela plataforma
      const mimeType = getSupportedRecordingMimeType();
      mimeTypeRef.current = mimeType || 'audio/webm';
      
      // Criar MediaRecorder com opções otimizadas
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      
      // Safari: audioBitsPerSecond ajuda na qualidade
      if (browserInfo.isSafari || browserInfo.isIOS) {
        recorderOptions.audioBitsPerSecond = 128000;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Safari: timeslice maior para evitar problemas
      const timeslice = browserInfo.isSafari || browserInfo.isIOS ? 1000 : 100;
      mediaRecorder.start(timeslice);
      startTimeRef.current = Date.now();

      // Iniciar análise de frequência
      startFrequencyAnalysis();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);

      onRecordingStart?.();
    } catch (error) {
      console.error("[useAudioRecorder] Error starting:", error);
      setState("error");
      
      // Mensagens de erro específicas para Safari/iOS
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          const msg = browserInfo.isIOS 
            ? "Permissão negada. Vá em Ajustes > Safari > Microfone"
            : "Permissão de microfone negada";
          onError?.(msg);
        } else if (error.name === 'NotFoundError') {
          onError?.("Microfone não encontrado");
        } else if (error.name === 'NotReadableError') {
          onError?.("Microfone em uso por outro app");
        } else {
          onError?.("Erro ao acessar microfone");
        }
      } else {
        onError?.("Não foi possível acessar o microfone");
      }
    }
  }, [cleanup, maxDuration, onRecordingStart, onError, browserInfo, startFrequencyAnalysis]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || state !== "recording") return;

    setState("processing");

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        const finalDuration = (Date.now() - startTimeRef.current) / 1000;

        // Usar mimeType salvo na ref
        const finalMimeType = mimeTypeRef.current || mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMimeType });

        console.log('[AudioRecorder] Blob created:', {
          size: blob.size,
          type: blob.type,
          chunks: chunksRef.current.length,
          duration: finalDuration,
          browser: browserInfo.isSafari ? 'Safari' : browserInfo.isIOS ? 'iOS' : 'Other'
        });

        const validation = validateAudioBlob(blob, minSizeKB, minDuration, finalDuration);

        if (!validation.valid) {
          console.warn("[useAudioRecorder] Invalid audio:", validation.reason);
          onError?.(validation.reason || "Áudio muito curto");
          cleanup();
          setState("idle");
          resolve();
          return;
        }

        try {
          const base64 = await blobToBase64(blob);
          setAudioBlob(blob);
          setAudioBase64(base64);
          onRecordingStop?.(blob, finalDuration);
        } catch (error) {
          console.error("[useAudioRecorder] Error converting:", error);
          onError?.("Erro ao processar áudio");
        }

        cleanup();
        setState("idle");
        resolve();
      };

      mediaRecorder.stop();
    });
  }, [state, cleanup, minSizeKB, minDuration, onRecordingStop, onError, browserInfo]);

  const cancelRecording = useCallback(() => {
    cleanup();
    setState("idle");
    setDuration(0);
    setAudioBlob(null);
    setAudioBase64(null);
  }, [cleanup]);

  const reset = useCallback(() => {
    cancelRecording();
  }, [cancelRecording]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    duration,
    audioBlob,
    audioBase64,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    browserInfo,
  };
}

export default useAudioRecorder;
