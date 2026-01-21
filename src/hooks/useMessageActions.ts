/**
 * ============================================================
 * hooks/useMessageActions.ts
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Histo_rico_objeto.zip
 * Hook para acoes de compartilhamento, download e transcricao
 * ============================================================
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { HistoryMessage, ModuleType } from "@/types/pwa-history";

interface UseMessageActionsOptions {
  moduleType: ModuleType;
}

interface UseMessageActionsReturn {
  // Estado
  isGeneratingAudio: boolean;
  isDownloading: boolean;

  // Acoes
  shareText: (message: HistoryMessage) => Promise<void>;
  shareAudio: (message: HistoryMessage) => Promise<void>;
  downloadAudio: (message: HistoryMessage) => Promise<void>;
  generateAndDownload: (message: HistoryMessage) => Promise<void>;
  copyToClipboard: (text: string) => Promise<void>;
}

export function useMessageActions({ moduleType }: UseMessageActionsOptions): UseMessageActionsReturn {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ============================================================
  // COMPARTILHAR TEXTO
  // ============================================================
  const shareText = useCallback(async (message: HistoryMessage) => {
    const shareData = {
      title: "Conversa KnowYOU",
      text: message.transcription || message.content,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success("Compartilhado!");
      } else {
        await navigator.clipboard.writeText(shareData.text);
        toast.success("Texto copiado!");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("[useMessageActions] Erro ao compartilhar:", error);
        toast.error("Erro ao compartilhar");
      }
    }
  }, []);

  // ============================================================
  // COMPARTILHAR AUDIO
  // ============================================================
  const shareAudio = useCallback(async (message: HistoryMessage) => {
    if (!message.audioUrl) {
      toast.error("Audio nao disponivel");
      return;
    }

    try {
      const response = await fetch(message.audioUrl);
      const blob = await response.blob();
      const file = new File([blob], `audio-${message.id.slice(0, 8)}.mp3`, {
        type: "audio/mpeg",
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Audio KnowYOU",
        });
        toast.success("Audio compartilhado!");
      } else {
        // Fallback: download
        await downloadAudio(message);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("[useMessageActions] Erro ao compartilhar audio:", error);
        toast.error("Erro ao compartilhar audio");
      }
    }
  }, []);

  // ============================================================
  // DOWNLOAD DE AUDIO
  // ============================================================
  const downloadAudio = useCallback(
    async (message: HistoryMessage) => {
      if (!message.audioUrl) {
        toast.error("Audio nao disponivel para download");
        return;
      }

      setIsDownloading(true);

      try {
        const response = await fetch(message.audioUrl);
        if (!response.ok) throw new Error("Falha ao buscar audio");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `knowyou-${moduleType}-${message.id.slice(0, 8)}.mp3`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
        toast.success("Download concluido!");
      } catch (error) {
        console.error("[useMessageActions] Erro no download:", error);
        toast.error("Erro ao baixar audio");
      } finally {
        setIsDownloading(false);
      }
    },
    [moduleType],
  );

  // ============================================================
  // GERAR AUDIO E FAZER DOWNLOAD
  // ============================================================
  const generateAndDownload = useCallback(
    async (message: HistoryMessage) => {
      // Se ja tem audio, fazer download direto
      if (message.audioUrl) {
        return downloadAudio(message);
      }

      setIsGeneratingAudio(true);
      toast.info("Gerando audio...");

      try {
        // Chamar TTS para gerar audio
        const { data, error } = await supabase.functions.invoke("text-to-speech", {
          body: {
            text: message.transcription || message.content,
            agentSlug: moduleType,
          },
        });

        if (error) throw error;

        if (!data?.audio) {
          throw new Error("Nenhum audio retornado");
        }

        // Converter base64 para blob
        const audioBytes = atob(data.audio);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
          audioArray[i] = audioBytes.charCodeAt(i);
        }
        const blob = new Blob([audioArray], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        // Download
        const a = document.createElement("a");
        a.href = url;
        a.download = `knowyou-${moduleType}-${message.id.slice(0, 8)}.mp3`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
        toast.success("Audio gerado e baixado!");
      } catch (error) {
        console.error("[useMessageActions] Erro ao gerar audio:", error);
        toast.error("Erro ao gerar audio");
      } finally {
        setIsGeneratingAudio(false);
      }
    },
    [moduleType, downloadAudio],
  );

  // ============================================================
  // COPIAR PARA CLIPBOARD
  // ============================================================
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado!");
    } catch (error) {
      console.error("[useMessageActions] Erro ao copiar:", error);
      toast.error("Erro ao copiar");
    }
  }, []);

  return {
    isGeneratingAudio,
    isDownloading,
    shareText,
    shareAudio,
    downloadAudio,
    generateAndDownload,
    copyToClipboard,
  };
}

export default useMessageActions;
