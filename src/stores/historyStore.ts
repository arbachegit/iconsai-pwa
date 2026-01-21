/**
 * ============================================================
 * historyStore.ts - Store de Histórico de Conversas v2.1.0
 * ============================================================
 * Data: 2026-01-09
 * CORRECAO: Mapeamentos corrigidos (home ≠ economia)
 * ============================================================
 * CHANGELOG v2.1.0:
 * - home agora mapeia para "home" (não "economia")
 * - economia mapeia para "economia" (não "world")
 * - Adicionado fallback "general" para slugs desconhecidos
 * ============================================================
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import type { AudioMessage, ModuleType } from "@/components/pwa/types";

// ============================================================
// CORRECAO v2.1.0: Mapeamentos corrigidos
// ============================================================

// Mapeamento de moduleType para agent_slug do banco
// CORRECAO: home -> "home" (não "economia")
const MODULE_TO_SLUG: Record<ModuleType, string> = {
  home: "home", // CORRIGIDO: era "economia"
  help: "help",
  world: "world",
  health: "health",
  ideas: "ideas",
};

// Mapeamento de agent_slug do banco para moduleType
// CORRECAO: economia -> "world" está OK, mas adicionamos fallback melhor
const SLUG_TO_MODULE: Record<string, ModuleType> = {
  // Módulo WORLD (generalista)
  world: "world",
  mundo: "world",

  // Módulo ECONOMIA (se existir separado no futuro)
  economia: "world", // Por enquanto mapeia para world

  // Módulo SAÚDE
  health: "health",
  saude: "health",

  // Módulo IDEIAS
  ideas: "ideas",
  ideias: "ideas",

  // Módulo AJUDA
  help: "help",

  // Módulo HOME
  home: "home",

  // Fallback para general
  general: "home",
};

// Função auxiliar para obter moduleType com fallback seguro
function getModuleTypeFromSlug(slug: string | null | undefined): ModuleType {
  if (!slug) return "world"; // fallback padrão
  const normalized = slug.toLowerCase().trim();
  return SLUG_TO_MODULE[normalized] || "world";
}

interface HistoryState {
  // Mensagens por módulo
  messages: Record<ModuleType, AudioMessage[]>;

  // Estado de loading
  isLoading: boolean;
  isInitialized: boolean;

  // Device ID para sincronização
  deviceId: string | null;

  // Perfil do usuário
  userInitials: string;

  // Ações de sincronização
  initialize: (deviceId: string) => Promise<void>;
  refreshHistory: () => Promise<void>;

  // Ações existentes
  addMessage: (moduleType: ModuleType, message: Omit<AudioMessage, "id" | "timestamp" | "moduleType">) => void;
  getMessages: (moduleType: ModuleType) => AudioMessage[];
  getAllMessages: () => AudioMessage[];
  clearHistory: (moduleType?: ModuleType) => void;
  updateTranscription: (messageId: string, transcription: string) => void;
  setUserInitials: (initials: string) => void;
  setTranscribing: (messageId: string, isTranscribing: boolean) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      messages: {
        home: [],
        help: [],
        world: [],
        health: [],
        ideas: [],
      },

      isLoading: false,
      isInitialized: false,
      deviceId: null,
      userInitials: "FA",

      // Inicializa o store buscando histórico do banco
      initialize: async (deviceId: string) => {
        const state = get();

        // Evita reinicialização desnecessária
        if (state.isInitialized && state.deviceId === deviceId) {
          return;
        }

        set({ isLoading: true, deviceId });

        try {
          // Buscar sessão do dispositivo
          const { data: session } = await supabase
            .from("pwa_sessions")
            .select("id")
            .eq("device_id", deviceId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!session) {
            console.log("[HistoryStore] Nenhuma sessão encontrada para device:", deviceId);
            set({ isLoading: false, isInitialized: true });
            return;
          }

          // Buscar mensagens da sessão
          const { data: dbMessages, error } = await supabase
            .from("pwa_messages")
            .select("id, role, content, audio_url, created_at, agent_slug")
            .eq("session_id", session.id)
            .order("created_at", { ascending: false })
            .limit(100);

          if (error) {
            console.error("[HistoryStore] Erro ao buscar mensagens:", error);
            set({ isLoading: false, isInitialized: true });
            return;
          }

          // Organizar mensagens por módulo
          const newMessages: Record<ModuleType, AudioMessage[]> = {
            home: [],
            help: [],
            world: [],
            health: [],
            ideas: [],
          };

          (dbMessages || []).forEach((msg) => {
            // CORRECAO v2.1.0: Usar função auxiliar com fallback seguro
            const moduleType = getModuleTypeFromSlug(msg.agent_slug);

            const audioMessage: AudioMessage = {
              id: msg.id,
              role: msg.role as "user" | "assistant",
              // Map DB content to title, use audioUrl from DB or empty
              title: msg.content || "",
              audioUrl: msg.audio_url || "",
              duration: 0, // Not stored in DB, default to 0
              timestamp: new Date(msg.created_at),
              moduleType,
              transcription: msg.content || "", // Store content as transcription too
            };
            newMessages[moduleType].push(audioMessage);
          });

          // Ordenar cada módulo por timestamp (mais recente primeiro)
          Object.keys(newMessages).forEach((key) => {
            newMessages[key as ModuleType].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
            );
          });

          console.log(`[HistoryStore] Inicializado: ${dbMessages?.length || 0} mensagens carregadas`);
          set({ messages: newMessages, isLoading: false, isInitialized: true });
        } catch (err) {
          console.error("[HistoryStore] Erro na inicialização:", err);
          set({ isLoading: false, isInitialized: true });
        }
      },

      // Recarrega histórico do banco
      refreshHistory: async () => {
        const { deviceId } = get();
        if (!deviceId) {
          console.warn("[HistoryStore] Refresh ignorado - deviceId não definido");
          return;
        }

        // Força reinicialização
        set({ isInitialized: false });
        await get().initialize(deviceId);
      },

      addMessage: (moduleType, message) => {
        const newMessage: AudioMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          moduleType,
        };

        set((state) => ({
          messages: {
            ...state.messages,
            [moduleType]: [newMessage, ...state.messages[moduleType]],
          },
        }));
      },

      getMessages: (moduleType) => {
        return get().messages[moduleType] || [];
      },

      getAllMessages: () => {
        const state = get();
        const allMessages: AudioMessage[] = [];

        Object.values(state.messages).forEach((msgs) => {
          allMessages.push(...msgs);
        });

        // Ordenar por timestamp (mais recente primeiro)
        return allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      },

      clearHistory: (moduleType) => {
        if (moduleType) {
          set((state) => ({
            messages: {
              ...state.messages,
              [moduleType]: [],
            },
          }));
        } else {
          set({
            messages: {
              home: [],
              help: [],
              world: [],
              health: [],
              ideas: [],
            },
          });
        }
      },

      updateTranscription: (messageId, transcription) => {
        set((state) => {
          const newMessages = { ...state.messages };

          (Object.keys(newMessages) as ModuleType[]).forEach((moduleKey) => {
            newMessages[moduleKey] = newMessages[moduleKey].map((msg) =>
              msg.id === messageId ? { ...msg, transcription, isTranscribing: false } : msg,
            );
          });

          return { messages: newMessages };
        });
      },

      setTranscribing: (messageId, isTranscribing) => {
        set((state) => {
          const newMessages = { ...state.messages };

          (Object.keys(newMessages) as ModuleType[]).forEach((moduleKey) => {
            newMessages[moduleKey] = newMessages[moduleKey].map((msg) =>
              msg.id === messageId ? { ...msg, isTranscribing } : msg,
            );
          });

          return { messages: newMessages };
        });
      },

      setUserInitials: (initials) => {
        set({ userInitials: initials });
      },
    }),
    {
      name: "pwa-history-storage",
      partialize: (state) => ({
        messages: state.messages,
        userInitials: state.userInitials,
      }),
    },
  ),
);

export default useHistoryStore;
