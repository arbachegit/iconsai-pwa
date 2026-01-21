/**
 * ============================================================
 * AudioMessageCard.tsx - Card de Mensagem de Áudio/Texto
 * ============================================================
 * Versão: 2.1.0 - 2026-01-09
 * NOVO: Botão Play TTS no footer para ler texto em voz alta
 * ============================================================
 * CHANGELOG v2.1.0:
 * - Adicionado botão Play/Stop TTS no footer do card de texto
 * - Usa hook useTextToSpeech para síntese de voz
 * - Ícone muda entre Play/Pause/Loading conforme estado
 * ============================================================
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Share2,
  FileText,
  Send,
  Download,
  Bot,
  Loader2,
  X,
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { AudioMessage } from "@/components/pwa/types";
import { supabase } from "@/integrations/supabase/client";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

interface AudioMessageCardProps {
  message: AudioMessage;
  userInitials: string;
  onTranscriptionUpdate?: (messageId: string, transcription: string) => void;
}

export const AudioMessageCard: React.FC<AudioMessageCardProps> = ({ message, userInitials, onTranscriptionUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(message.transcription || "");
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hook TTS para ler texto em voz alta
  const { speak, stop, isPlaying: isTTSPlaying, isLoading: isTTSLoading } = useTextToSpeech();

  const isAssistant = message.role === "assistant";

  // CORREÇÃO v2.0.0: Verificar se tem áudio válido
  const hasAudio = message.audioUrl && message.audioUrl.trim() !== "";

  // Conteúdo de texto (transcription ou title)
  const textContent = transcription || message.transcription || message.title || "";

  // Inicializar áudio APENAS se tiver audioUrl
  useEffect(() => {
    if (!hasAudio) return;

    audioRef.current = new Audio(message.audioUrl);

    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onpause = () => setIsPlaying(false);
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        const prog = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(prog);
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [message.audioUrl, hasAudio]);

  // Formatar tempo (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!audioRef.current || !hasAudio) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Seek no áudio
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !hasAudio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * audioRef.current.duration;
  };

  // Ação: Copiar texto
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  // Ação: Compartilhar
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: message.title || "Mensagem KnowYOU",
          text: textContent,
          ...(hasAudio && { url: message.audioUrl }),
        });
      } else {
        await navigator.clipboard.writeText(textContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  // NOVO v2.1.0: Ação Play TTS - ler texto em voz alta
  const handlePlayTTS = async () => {
    if (isTTSPlaying) {
      stop();
    } else if (textContent) {
      // Usar moduleType da mensagem se disponível
      const moduleType = message.moduleType || "world";
      await speak(textContent, moduleType);
    }
  };

  // Ação: Transcrever áudio (apenas se tiver áudio)
  const handleTranscribe = async () => {
    if (!hasAudio) return;

    if (transcription) {
      setShowTranscription(!showTranscription);
      return;
    }

    setIsTranscribing(true);

    try {
      const response = await fetch(message.audioUrl);
      const audioBlob = await response.blob();

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
      );

      let mimeType = audioBlob.type;
      if (!mimeType || mimeType === "") {
        if (message.audioUrl.includes(".mp4") || message.audioUrl.includes(".m4a")) {
          mimeType = "audio/mp4";
        } else if (message.audioUrl.includes(".mp3")) {
          mimeType = "audio/mpeg";
        } else {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          mimeType = isIOS || isSafari ? "audio/mp4" : "audio/webm";
        }
      }

      const { data, error } = await supabase.functions.invoke("voice-to-text", {
        body: { audio: base64Audio, mimeType },
      });

      if (error) throw error;

      const text = data?.text || "";
      setTranscription(text);
      setShowTranscription(true);

      onTranscriptionUpdate?.(message.id, text);
    } catch (error) {
      console.error("Erro ao transcrever:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Ação: Download (apenas se tiver áudio)
  const handleDownload = async () => {
    if (!hasAudio) return;

    try {
      const response = await fetch(message.audioUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `knowyou_${message.id}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar:", error);
    }
  };

  // ============================================================
  // RENDERIZAÇÃO: MODO TEXTO (sem áudio)
  // ============================================================
  if (!hasAudio) {
    return (
      <div className={`flex gap-3 ${isAssistant ? "flex-row" : "flex-row-reverse"}`}>
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isAssistant ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"
          }`}
        >
          {isAssistant ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>

        {/* Card de texto */}
        <div
          className={`flex-1 max-w-[85%] rounded-2xl p-3 ${
            isAssistant
              ? "bg-card border border-border rounded-tl-sm"
              : "bg-primary/10 border border-primary/20 rounded-tr-sm"
          }`}
        >
          {/* Conteúdo de texto */}
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{textContent}</p>

          {/* Footer: timestamp + ações */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground/60">
              {new Date(message.timestamp).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            <div className="flex gap-1">
              {/* NOVO v2.1.0: Botão Play TTS */}
              <button
                onClick={handlePlayTTS}
                disabled={isTTSLoading}
                className={`p-1.5 rounded-lg transition-colors ${
                  isTTSPlaying ? "bg-primary/20 text-primary" : "hover:bg-white/10"
                }`}
                title={isTTSPlaying ? "Parar" : "Ouvir"}
              >
                {isTTSLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                ) : isTTSPlaying ? (
                  <VolumeX className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>

              {/* Copiar */}
              <button
                onClick={handleCopyText}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Copiar"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>

              {/* Compartilhar */}
              <button
                onClick={handleShare}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Compartilhar"
              >
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDERIZAÇÃO: MODO ÁUDIO (com audioUrl)
  // ============================================================
  return (
    <div className={`flex gap-3 ${isAssistant ? "flex-row" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAssistant ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"
        }`}
      >
        {isAssistant ? <Bot className="w-5 h-5" /> : <span className="text-xs font-bold">{userInitials}</span>}
      </div>

      {/* Card de áudio */}
      <div
        className={`flex-1 max-w-[280px] rounded-2xl p-3 ${
          isAssistant ? "bg-card border border-border" : "bg-primary/10 border border-primary/20"
        }`}
      >
        {/* Título */}
        <p className="text-sm text-foreground font-medium mb-3 line-clamp-2">"{message.title}"</p>

        {/* Player de áudio */}
        <div className="flex items-center gap-3 mb-3">
          {/* Botão play/pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Barra de progresso */}
          <div className="flex-1 flex flex-col gap-1">
            <div onClick={handleSeek} className="h-2 bg-muted rounded-full cursor-pointer overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
            </div>

            {/* Tempo */}
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(message.duration)}</span>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-between gap-1">
          {/* Compartilhar */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-1"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground">Compartilhar</span>
          </button>

          {/* Transcrever */}
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-1 disabled:opacity-50"
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-[8px] text-muted-foreground">{transcription ? "Ver texto" : "Transcrever"}</span>
          </button>

          {/* Compartilhar transcrição */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-1"
          >
            <Send className="w-4 h-4 text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground">Enviar texto</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-1"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground">Baixar</span>
          </button>
        </div>

        {/* Transcrição expandida */}
        <AnimatePresence>
          {showTranscription && transcription && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 bg-muted/50 rounded-lg relative">
                <button
                  onClick={() => setShowTranscription(false)}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
                <p className="text-xs text-muted-foreground pr-6">{transcription}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timestamp */}
        <div className="text-right mt-2">
          <span className="text-[10px] text-muted-foreground/60">
            {new Date(message.timestamp).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioMessageCard;
