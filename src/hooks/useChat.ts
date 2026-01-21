import { useState, useEffect, useCallback, useRef } from "react";
import { streamChat, extractSuggestions, removeSuggestionsFromText, AgentConfig } from "@/lib/chat-stream";
import { AudioStreamPlayer, generateAudioUrl } from "@/lib/audio-player";
import { useToast } from "@/hooks/use-toast";
import { useAdminSettings } from "./useAdminSettings";
import { useChatAnalytics } from "./useChatAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { saveSuggestionAudit } from "@/lib/suggestion-audit";
import { notifySentimentAlert } from "@/lib/notification-dispatcher";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  audioUrl?: string;
  imageUrl?: string;
  type?: "text" | "file-data";
  fileData?: {
    data: any[];
    fileName: string;
    columns: string[];
    totalRecords?: number; // Total original de registros (para amostras)
  };
}

export type ChatType = "health" | "study";

export interface UseChatConfig {
  chatType: ChatType;
  storageKey: string;
  sessionIdPrefix: string;
  defaultSuggestions: string[];
  imageEndpoint: string;
  guardrailMessage: string;
}

export interface UseChatOptions {
  userRegion?: string;
}

export function useChat(config: UseChatConfig, options: UseChatOptions = {}) {
  const { chatType, storageKey, sessionIdPrefix, defaultSuggestions, imageEndpoint, guardrailMessage } = config;
  const { userRegion } = options;
  const { t } = useTranslation();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestions);
  const [currentSentiment, setCurrentSentiment] = useState<{
    label: "positive" | "negative" | "neutral";
    score: number;
  } | null>(null);
  const [sessionId] = useState(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timestamp = Date.now();
    return `${sessionIdPrefix}${dateStr}_${timestamp}`;
  });
  const [activeDisclaimer, setActiveDisclaimer] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [attachedDocumentId, setAttachedDocumentId] = useState<string | null>(null);
  
  // Estado para guardar o último fileData ativo da sessão (para enviar em todas as mensagens subsequentes)
  const [activeFileData, setActiveFileData] = useState<{
    data: any[];
    fileName: string;
    columns: string[];
  } | null>(null);
  
  // Ref para manter dados completos do arquivo em memória (não vai para localStorage)
  const fileDataMapRef = useRef<Map<number, { data: any[]; fileName: string; columns: string[]; timestamp: number }>>(new Map());
  
  // MEMORY OPTIMIZATION: Cleanup timer for fileDataMapRef
  const fileDataCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const audioPlayerRef = useRef<AudioStreamPlayer>(new AudioStreamPlayer());
  const { toast } = useToast();
  const { settings } = useAdminSettings();
  const { createSession, updateSession } = useChatAnalytics();
  const [audioProgress, setAudioProgress] = useState<{
    currentTime: number;
    duration: number;
  }>({ currentTime: 0, duration: 0 });

  // MEMORY OPTIMIZATION: Cleanup fileDataMapRef after 5 minutes of inactivity
  const scheduleFileDataCleanup = useCallback(() => {
    if (fileDataCleanupTimerRef.current) {
      clearTimeout(fileDataCleanupTimerRef.current);
    }
    
    const CLEANUP_DELAY = 5 * 60 * 1000; // 5 minutes
    
    fileDataCleanupTimerRef.current = setTimeout(() => {
      const now = Date.now();
      
      // Remove entries older than 5 minutes
      fileDataMapRef.current.forEach((value, key) => {
        if (now - value.timestamp > CLEANUP_DELAY) {
          fileDataMapRef.current.delete(key);
        }
      });
      
      // If map is too large (>10 entries), keep only the 5 most recent
      if (fileDataMapRef.current.size > 10) {
        const entries = Array.from(fileDataMapRef.current.entries())
          .sort((a, b) => b[1].timestamp - a[1].timestamp)
          .slice(0, 5);
        fileDataMapRef.current = new Map(entries);
      }
    }, CLEANUP_DELAY);
  }, []);

  // Configure audio progress callback
  useEffect(() => {
    audioPlayerRef.current.setOnProgress((currentTime, duration) => {
      setAudioProgress({ currentTime, duration });
    });
    
    // MEMORY OPTIMIZATION: Cleanup on unmount
    return () => {
      if (fileDataCleanupTimerRef.current) {
        clearTimeout(fileDataCleanupTimerRef.current);
      }
      fileDataMapRef.current.clear();
    };
  }, []);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(
          parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }

    createSession({ session_id: sessionId, user_name: null }).catch(console.error);
  }, [sessionId, createSession, storageKey]);

  // Save history to localStorage (com amostra limitada de fileData)
  const saveHistory = useCallback((msgs: Message[]) => {
    try {
      const messagesForStorage = msgs.map((m, idx) => ({
        ...m,
        audioUrl: m.audioUrl && !m.audioUrl.startsWith('blob:') ? m.audioUrl : undefined,
        // Salvar apenas amostra dos dados para não estourar localStorage
        fileData: m.fileData ? {
          fileName: m.fileData.fileName,
          columns: m.fileData.columns,
          data: m.fileData.data.slice(0, 50), // Apenas primeiros 50 registros
          totalRecords: m.fileData.totalRecords || m.fileData.data.length,
        } : undefined,
      }));
      localStorage.setItem(storageKey, JSON.stringify(messagesForStorage));
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
    }
  }, [storageKey]);

  const analyzeSentiment = useCallback(async (text: string, currentMessages: Message[]) => {
    try {
      const { data, error } = await supabase.functions.invoke("analyze-sentiment", {
        body: { text },
      });

      if (error) throw error;

      const sentiment = {
        label: data.sentiment_label as "positive" | "negative" | "neutral",
        score: parseFloat(data.sentiment_score),
      };

      setCurrentSentiment(sentiment);

      if (
        settings?.alert_enabled &&
        sentiment.label === "negative" &&
        sentiment.score < (settings.alert_threshold || 0.3) &&
        settings.alert_email
      ) {
        // Legacy direct email alert
        await supabase.functions.invoke("sentiment-alert", {
          body: {
            session_id: sessionId,
            sentiment_label: sentiment.label,
            sentiment_score: sentiment.score,
            last_messages: currentMessages.slice(-3).map((m) => ({ role: m.role, content: m.content })),
            alert_email: settings.alert_email,
          },
        });

        // Dispatch via centralized notification system
        notifySentimentAlert(sessionId, sentiment.label, text).catch(console.error);
      }

      return sentiment;
    } catch (error) {
      console.error("Erro ao analisar sentimento:", error);
      return null;
    }
  }, [sessionId, settings]);

  const sendMessage = useCallback(
    async (
      input: string,
      options?: { 
        fileData?: { data: any[]; fileName: string; columns: string[] };
        agentConfig?: AgentConfig;
      }
    ) => {
      if (!input.trim() || isLoading) return;

      // MEMORY OPTIMIZATION: Limit file data size (max 5MB in memory)
      const MAX_FILE_SIZE_RECORDS = 5000;
      
      // Se tem fileData novo, guardar em memória completo E no activeFileData
      if (options?.fileData) {
        const msgIndex = messages.length;
        const limitedData = options.fileData.data.slice(0, MAX_FILE_SIZE_RECORDS);
        
        fileDataMapRef.current.set(msgIndex, {
          data: limitedData,
          fileName: options.fileData.fileName,
          columns: options.fileData.columns,
          timestamp: Date.now(), // Add timestamp for cleanup
        });
        
        // Schedule cleanup after storing new data
        scheduleFileDataCleanup();
        
        // Salvar amostra no activeFileData para enviar em todas as mensagens subsequentes
        setActiveFileData({
          data: limitedData.slice(0, 100), // Amostra de até 100 registros
          fileName: options.fileData.fileName,
          columns: options.fileData.columns,
        });
      }

      const userMsg: Message = {
        role: "user",
        content: input,
        timestamp: new Date(),
        type: options?.fileData ? "file-data" : "text",
        fileData: options?.fileData ? {
          ...options.fileData,
          totalRecords: options.fileData.data.length,
        } : undefined,
      };

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      saveHistory(newMessages);
      setIsLoading(true);

      await analyzeSentiment(input, newMessages);

      let assistantContent = "";
      let fullResponse = "";

      const updateAssistantMessage = (nextChunk: string) => {
        assistantContent += nextChunk;
        fullResponse = assistantContent;

        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, content: removeSuggestionsFromText(assistantContent) }
                : m
            );
          }
          return [
            ...prev,
            {
              role: "assistant",
              content: removeSuggestionsFromText(assistantContent),
              timestamp: new Date(),
            },
          ];
        });
      };

      try {
        if (attachedDocumentId) {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-router`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
                chatType,
                documentId: attachedDocumentId,
                sessionId: sessionId,
              }),
            }
          );

          if (!response.ok || !response.body) {
            throw new Error("Failed to start stream");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let textBuffer = "";
          let streamDone = false;

          while (!streamDone) {
            const { done, value } = await reader.read();
            if (done) break;
            textBuffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, newlineIndex);
              textBuffer = textBuffer.slice(newlineIndex + 1);

              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (line.startsWith(":") || line.trim() === "") continue;
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") {
                streamDone = true;
                break;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) updateAssistantMessage(content);
              } catch {
                textBuffer = line + "\n" + textBuffer;
                break;
              }
            }
          }

          setAttachedDocumentId(null);
          
          // Process for unified chat path
          const extractedSuggestions = extractSuggestions(fullResponse);
          if (extractedSuggestions.length > 0) {
            setSuggestions(extractedSuggestions);
            saveSuggestionAudit({
              sessionId,
              chatType,
              userQuery: input,
              aiResponsePreview: fullResponse,
              suggestionsGenerated: extractedSuggestions,
              hasRagContext: fullResponse.includes("CONTEXTO RELEVANTE"),
            });
          }

          const cleanedResponse = removeSuggestionsFromText(fullResponse);

          if (settings?.chat_audio_enabled) {
            setIsGeneratingAudio(true);
            try {
              const audioUrl = await generateAudioUrl(cleanedResponse, chatType);
              setMessages((prev) => {
                const updated = prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: cleanedResponse, audioUrl } : m
                );
                saveHistory(updated);
                return updated;
              });
              updateSession({
                session_id: sessionId,
                updates: { audio_plays: messages.filter(m => m.audioUrl).length + 1 },
              }).catch(console.error);
            } catch (error) {
              console.error("Erro ao gerar áudio:", error);
              setMessages((prev) => {
                const updated = prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: cleanedResponse } : m
                );
                saveHistory(updated);
                return updated;
              });
            } finally {
              setIsGeneratingAudio(false);
            }
          } else {
            setMessages((prev) => {
              const updated = prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: cleanedResponse } : m
              );
              saveHistory(updated);
              return updated;
            });
          }

          updateSession({
            session_id: sessionId,
            updates: { message_count: messages.length + 2 },
          }).catch(console.error);

          setIsLoading(false);
        } else {
          // Preparar mensagens com fileData completo (da memória ou localStorage)
          // IMPORTANTE: Incluir activeFileData na ÚLTIMA mensagem do usuário se não tiver fileData próprio
          const messagesWithFileData = newMessages.map((m, idx) => {
            // Tentar pegar dados completos da memória primeiro
            const fullFileData = fileDataMapRef.current.get(idx);
            
            // Se a mensagem já tem fileData (da memória ou localStorage), usar ela
            if (fullFileData || m.fileData) {
              return { 
                role: m.role, 
                content: m.content,
                fileData: fullFileData || m.fileData
              };
            }
            
            // Se é a última mensagem do usuário e temos activeFileData, incluir
            if (activeFileData && m.role === "user" && idx === newMessages.length - 1) {
              return { 
                role: m.role, 
                content: m.content,
                fileData: activeFileData
              };
            }
            
            return { role: m.role, content: m.content };
          });
          
          await streamChat({
            messages: messagesWithFileData,
            onDelta: (chunk) => updateAssistantMessage(chunk),
            chatType,
            region: userRegion,
            agentConfig: options?.agentConfig,
            onDone: async () => {
              const extractedSuggestions = extractSuggestions(fullResponse);
              if (extractedSuggestions.length > 0) {
                setSuggestions(extractedSuggestions);
                saveSuggestionAudit({
                  sessionId,
                  chatType,
                  userQuery: input,
                  aiResponsePreview: fullResponse,
                  suggestionsGenerated: extractedSuggestions,
                  hasRagContext: fullResponse.includes("CONTEXTO RELEVANTE"),
                });
              }

              const cleanedResponse = removeSuggestionsFromText(fullResponse);

              if (settings?.chat_audio_enabled) {
                setIsGeneratingAudio(true);
                try {
                  const audioUrl = await generateAudioUrl(cleanedResponse, chatType);
                  
                  setMessages((prev) => {
                    const updated = prev.map((m, i) =>
                      i === prev.length - 1
                        ? { ...m, content: cleanedResponse, audioUrl }
                        : m
                    );
                    saveHistory(updated);
                    return updated;
                  });

                  updateSession({
                    session_id: sessionId,
                    updates: { audio_plays: messages.filter(m => m.audioUrl).length + 1 },
                  }).catch(console.error);
                } catch (error) {
                  console.error("Erro ao gerar áudio:", error);
                  setMessages((prev) => {
                    const updated = prev.map((m, i) =>
                      i === prev.length - 1
                        ? { ...m, content: cleanedResponse }
                        : m
                    );
                    saveHistory(updated);
                    return updated;
                  });
                } finally {
                  setIsGeneratingAudio(false);
                }
              } else {
                setMessages((prev) => {
                  const updated = prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, content: cleanedResponse }
                      : m
                  );
                  saveHistory(updated);
                  return updated;
                });
              }

              updateSession({
                session_id: sessionId,
                updates: { message_count: messages.length + 2 },
              }).catch(console.error);

              setIsLoading(false);
            },
            onError: (error) => {
              toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
              });
              setIsLoading(false);
            },
          });
        }
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        toast({
          title: "Erro",
          description: "Não foi possível enviar a mensagem. Tente novamente.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    },
    [messages, isLoading, toast, saveHistory, settings, sessionId, updateSession, attachedDocumentId, analyzeSentiment, chatType, userRegion]
  );

  const clearHistory = useCallback(() => {
    audioPlayerRef.current.stop();
    setMessages([]);
    setCurrentlyPlayingIndex(null);
    setSuggestions(defaultSuggestions);
    setActiveFileData(null); // Limpar dados do arquivo ativo
    fileDataMapRef.current.clear(); // Limpar cache de arquivos
    localStorage.removeItem(storageKey);
  }, [storageKey, defaultSuggestions]);

  const playAudio = useCallback(async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message) return;

    let audioUrlToPlay = message.audioUrl;

    if (!audioUrlToPlay || audioUrlToPlay.startsWith('blob:')) {
      try {
        setIsGeneratingAudio(true);
        const generatedUrl = await generateAudioUrl(message.content, chatType);
        
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[messageIndex]) {
            updated[messageIndex] = { ...updated[messageIndex], audioUrl: generatedUrl };
          }
          saveHistory(updated);
          return updated;
        });
        
        audioUrlToPlay = generatedUrl;
      } catch (error) {
        console.error("Erro ao gerar áudio sob demanda:", error);
        toast({
          title: "Erro",
          description: "Não foi possível gerar o áudio.",
          variant: "destructive",
        });
        return;
      } finally {
        setIsGeneratingAudio(false);
      }
    }

    try {
      audioPlayerRef.current.stop();
      setCurrentlyPlayingIndex(messageIndex);
      await audioPlayerRef.current.playAudioFromUrl(audioUrlToPlay);
      setCurrentlyPlayingIndex(null);
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[messageIndex]) {
          updated[messageIndex] = { ...updated[messageIndex], audioUrl: undefined };
        }
        return updated;
      });
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o áudio. Tente novamente.",
        variant: "destructive",
      });
      setCurrentlyPlayingIndex(null);
    }
  }, [messages, saveHistory, toast, chatType]);

  const stopAudio = useCallback(() => {
    try {
      audioPlayerRef.current.stop();
    } catch (e) {
      console.error('Error stopping audio:', e);
    }
    setCurrentlyPlayingIndex(null);
  }, []);

  const generateImage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isGeneratingImage) return;

      setIsGeneratingImage(true);

      try {
        const { data, error } = await supabase.functions.invoke(imageEndpoint, {
          body: { prompt },
        });

        if (error) throw error;

        if (data?.error === "guardrail_violation") {
          const rejectedTerm = data.rejected_term || prompt;

          const guardrailMsg: Message = {
            role: "assistant",
            content: `${guardrailMessage} "${rejectedTerm}"`,
            timestamp: new Date(),
          };

          const updatedMessages = [...messages, guardrailMsg];
          setMessages(updatedMessages);
          saveHistory(updatedMessages);

          setIsGeneratingImage(false);
          return;
        }

        if (!data?.imageUrl) {
          throw new Error("Nenhuma imagem foi gerada");
        }

        const imageMessage: Message = {
          role: "assistant",
          content: `Aqui está a imagem sobre: ${prompt}`,
          timestamp: new Date(),
          imageUrl: data.imageUrl,
        };

        const updatedMessages = [...messages, imageMessage];
        setMessages(updatedMessages);
        saveHistory(updatedMessages);

        toast({
          title: "Imagem gerada",
          description: "A imagem foi criada com sucesso!",
        });
      } catch (error: any) {
        console.error("Erro ao gerar imagem:", error);
        toast({
          title: t("chat.imageRejected"),
          description: error.message || t("chat.imageGenerationError"),
          variant: "destructive",
        });
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [messages, isGeneratingImage, toast, saveHistory, t, imageEndpoint, guardrailMessage]
  );

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      // Converter para base64 sem data URL prefix
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte), ""
        )
      );
      
      // Detectar mimeType com fallback
      let mimeType = audioBlob.type;
      if (!mimeType || mimeType === "") {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        mimeType = (isIOS || isSafari) ? "audio/mp4" : "audio/webm";
      }
      
      console.log('[useChat] Transcribing audio:', { 
        size: audioBlob.size, 
        mimeType,
        base64Length: base64Audio.length 
      });

      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio, mimeType }
      });

      if (error) throw error;
      return data.text || '';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }, []);

  const attachDocument = useCallback((documentId: string, documentName: string) => {
    setAttachedDocumentId(documentId);
    setActiveDisclaimer({
      title: t('documentAttach.disclaimerTitle'),
      message: t('documentAttach.disclaimerMessage', { documentName }),
    });
    toast({
      title: t('documentAttach.attached'),
      description: t('documentAttach.attachedDesc', { documentName }),
    });
  }, [toast, t]);

  const detachDocument = useCallback(() => {
    setAttachedDocumentId(null);
    setActiveDisclaimer(null);
    toast({
      title: t('documentAttach.removed'),
      description: t('documentAttach.removedDesc'),
    });
  }, [toast, t]);

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => {
      const updated = [...prev, msg];
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  return {
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
    addMessage,
  };
}
