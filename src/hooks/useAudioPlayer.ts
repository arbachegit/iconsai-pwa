/**
 * ============================================================
 * useAudioPlayer.ts - Hook para reprodução de áudio
 * ============================================================
 * Versão: 2.0.0 - 2026-01-10
 * Safari/iOS: Otimizado com unlockAudio e createOptimizedAudioElement
 * ============================================================
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { createOptimizedAudioElement, playAudioSafely, unlockAudio } from '@/utils/safari-audio';
import { getBrowserInfo } from '@/utils/safari-detect';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  play: (url: string) => Promise<void>;
  playBlob: (blob: Blob) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  error: string | null;
}

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 0;
      setCurrentTime(current);
      setProgress(total > 0 ? (current / total) * 100 : 0);
      
      if (isPlaying && !isPaused) {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, [isPlaying, isPaused]);

  const play = useCallback(async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { isSafari, isIOS } = getBrowserInfo();
      
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Safari/iOS: Unlock audio primeiro (requer gesto do usuário)
      if (isSafari || isIOS) {
        await unlockAudio();
      }
      
      // Criar audio element otimizado para Safari
      const audio = createOptimizedAudioElement();
      audio.src = url;
      audioRef.current = audio;
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };
      
      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setIsLoading(false);
        animationRef.current = requestAnimationFrame(updateProgress);
      };
      
      audio.onpause = () => {
        setIsPaused(true);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
        setCurrentTime(0);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
      
      audio.onerror = () => {
        setError("Erro ao carregar áudio");
        setIsLoading(false);
        setIsPlaying(false);
      };
      
      // Safari: load antes de play + pequeno delay
      audio.load();
      if (isSafari || isIOS) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Usar playAudioSafely para tratamento Safari
      await playAudioSafely(audio);
      
    } catch (err) {
      // Mensagem específica para Safari (NotAllowedError)
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Toque na tela para ativar o áudio');
      } else {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      }
      setIsLoading(false);
    }
  }, [updateProgress]);

  const playBlob = useCallback(async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    try {
      await play(url);
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
  }, [play]);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const resume = useCallback(() => {
    if (audioRef.current && isPaused) {
      audioRef.current.play();
    }
  }, [isPaused]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      setCurrentTime(0);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    isPaused,
    isLoading,
    progress,
    duration,
    currentTime,
    play,
    playBlob,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    error,
  };
};
