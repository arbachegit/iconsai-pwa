/**
 * ============================================================
 * Core useVoice - Captura de áudio (sem processamento)
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-20
 *
 * REGRAS:
 * - NUNCA processa ou envia áudio para APIs
 * - Apenas captura áudio do microfone
 * - Apenas emite callbacks com dados brutos
 * - Zero lógica de negócio
 * ============================================================
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { VoiceState, VoiceCaptureResult } from "../types";

interface UseVoiceOptions {
  /** Duração mínima em segundos */
  minDuration?: number;
  /** Duração máxima em segundos */
  maxDuration?: number;
  /** Callback quando captura finaliza */
  onCaptureComplete?: (result: VoiceCaptureResult) => void;
  /** Callback para dados de frequência (visualizador) */
  onFrequencyData?: (data: number[]) => void;
  /** Callback para erro */
  onError?: (error: Error) => void;
}

interface UseVoiceReturn {
  /** Estado atual */
  state: VoiceState;
  /** Duração atual da gravação em segundos */
  duration: number;
  /** Se está gravando */
  isRecording: boolean;
  /** Se está processando */
  isProcessing: boolean;
  /** Iniciar captura */
  startCapture: () => Promise<void>;
  /** Parar captura */
  stopCapture: () => void;
  /** Cancelar captura */
  cancelCapture: () => void;
  /** Dados de frequência atuais */
  frequencyData: number[];
  /** Erro atual */
  error: Error | null;
}

export const useVoice = (options: UseVoiceOptions = {}): UseVoiceReturn => {
  const {
    minDuration = 0.5,
    maxDuration = 60,
    onCaptureComplete,
    onFrequencyData,
    onError,
  } = options;

  const [state, setState] = useState<VoiceState>("idle");
  const [duration, setDuration] = useState(0);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Limpar recursos
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignorar erros ao parar
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Capturar dados de frequência
  const captureFrequencyData = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Converter para array de números normalizados (0-1)
    const normalizedData = Array.from(dataArray)
      .slice(0, 32)
      .map((v) => v / 255);

    setFrequencyData(normalizedData);
    onFrequencyData?.(normalizedData);

    if (state === "listening") {
      animationFrameRef.current = requestAnimationFrame(captureFrequencyData);
    }
  }, [state, onFrequencyData]);

  // Converter blob para base64
  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remover prefixo data:audio/...;base64,
        const base64Data = base64.split(",")[1] || base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  // Iniciar captura
  const startCapture = useCallback(async () => {
    try {
      setError(null);
      cleanup();

      // Verificar suporte
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Navegador não suporta captura de áudio");
      }

      // Obter stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Configurar AudioContext para análise de frequência
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Detectar formato suportado
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const mimeType = isIOS || isSafari ? "audio/mp4" : "audio/webm";

      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordingDuration = (Date.now() - startTimeRef.current) / 1000;

        if (recordingDuration < minDuration) {
          const err = new Error("Gravação muito curta");
          setError(err);
          onError?.(err);
          setState("idle");
          return;
        }

        if (chunksRef.current.length === 0) {
          const err = new Error("Nenhum áudio capturado");
          setError(err);
          onError?.(err);
          setState("idle");
          return;
        }

        try {
          setState("processing");
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          const audioBase64 = await blobToBase64(audioBlob);

          const result: VoiceCaptureResult = {
            audioBlob,
            audioBase64,
            duration: recordingDuration,
            mimeType,
          };

          onCaptureComplete?.(result);
          setState("idle");
        } catch (err) {
          const error = err instanceof Error ? err : new Error("Erro ao processar áudio");
          setError(error);
          onError?.(error);
          setState("error");
        }
      };

      // Iniciar gravação
      mediaRecorder.start(100); // chunks a cada 100ms
      startTimeRef.current = Date.now();
      setState("listening");
      setDuration(0);

      // Atualizar duração
      durationIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);

        // Auto-stop no limite máximo
        if (elapsed >= maxDuration) {
          stopCapture();
        }
      }, 100);

      // Iniciar captura de frequência
      captureFrequencyData();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Erro ao iniciar captura");
      setError(error);
      onError?.(error);
      setState("error");
      cleanup();
    }
  }, [cleanup, minDuration, maxDuration, onCaptureComplete, onError, blobToBase64, captureFrequencyData]);

  // Parar captura
  const stopCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    setFrequencyData([]);
  }, []);

  // Cancelar captura (sem emitir resultado)
  const cancelCapture = useCallback(() => {
    cleanup();
    setState("idle");
    setDuration(0);
    setFrequencyData([]);
  }, [cleanup]);

  return {
    state,
    duration,
    isRecording: state === "listening",
    isProcessing: state === "processing",
    startCapture,
    stopCapture,
    cancelCapture,
    frequencyData,
    error,
  };
};

export default useVoice;
