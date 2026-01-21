import { create } from "zustand";
import { persist } from "zustand/middleware";

// Types
export type AppState = "splash" | "welcome" | "idle" | "listening" | "processing" | "playing" | "module";
export type ModuleId = "help" | "world" | "health" | "ideas" | null;
export type PlayerState = "idle" | "loading" | "playing" | "waiting" | "processing" | "listening";
export type MicState = "hidden" | "emerging" | "listening" | "timeout" | "captured";
export type ModalType = "conversations" | "summary" | null;

export interface Conversation {
  id: string;
  module: ModuleId;
  messages: ConversationMessage[];
  summary: string;
  audioUrl?: string;
  transcript?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

export interface UserPreferences {
  interests: string[];
  communicationStyle: "formal" | "informal" | "neutral";
  healthProfile: Record<string, string>;
  learnedTopics: string[];
}

// Initial state for reset
const initialState = {
  // Auth
  isAuthenticated: false,
  deviceFingerprint: null as string | null,
  userId: null as string | null,
  userName: "",
  
  // App state
  appState: "splash" as AppState,
  previousState: null as AppState | null,
  activeModule: null as ModuleId,
  
  // Player
  playerState: "idle" as PlayerState,
  isPlaying: false,
  audioProgress: 0,
  currentAudioUrl: null as string | null,
  
  // Microphone
  micState: "hidden" as MicState,
  isMicVisible: false,
  isListening: false,
  micTimer: 10,
  transcript: "",
  interimTranscript: "",
  
  // Conversations
  conversations: [] as Conversation[],
  currentConversation: null as Conversation | null,
  
  // UI
  isModalOpen: false,
  modalType: null as ModalType,
  showIndicators: true,
  isFirstVisit: true,
  isSplashComplete: false,
  
  
  // Health module (OLDCARTS)
  healthAnswers: {} as Record<string, string>,
  
  // Ideas module
  ideaContent: "",
  ideaCritique: [] as string[],
  
  // User preferences
  userPreferences: {
    interests: [],
    communicationStyle: "neutral" as const,
    healthProfile: {},
    learnedTopics: [],
  } as UserPreferences,
};

interface PWAVoiceStore {
  // Auth
  isAuthenticated: boolean;
  deviceFingerprint: string | null;
  userId: string | null;
  userName: string;
  
  // App state
  appState: AppState;
  previousState: AppState | null;
  activeModule: ModuleId;
  
  // Player
  playerState: PlayerState;
  isPlaying: boolean;
  audioProgress: number;
  currentAudioUrl: string | null;
  
  // Microphone
  micState: MicState;
  isMicVisible: boolean;
  isListening: boolean;
  micTimer: number;
  transcript: string;
  interimTranscript: string;
  
  // Conversations
  conversations: Conversation[];
  currentConversation: Conversation | null;
  
  // UI
  isModalOpen: boolean;
  modalType: ModalType;
  showIndicators: boolean;
  isFirstVisit: boolean;
  isSplashComplete: boolean;
  
  
  // Health module
  healthAnswers: Record<string, string>;
  
  // Ideas module
  ideaContent: string;
  ideaCritique: string[];
  
  // User preferences
  userPreferences: UserPreferences;
  
  // Actions - Auth
  setAuthenticated: (
    auth: boolean,
    fingerprint?: string,
    userId?: string,
    name?: string
  ) => void;
  
  // Actions - App State
  setAppState: (state: AppState) => void;
  setActiveModule: (module: ModuleId) => void;
  
  // Actions - Player
  setPlayerState: (state: PlayerState) => void;
  setPlaying: (playing: boolean) => void;
  setAudioProgress: (progress: number) => void;
  setCurrentAudioUrl: (url: string | null) => void;
  
  // Actions - Microphone
  setMicState: (state: MicState) => void;
  setMicVisible: (visible: boolean) => void;
  setListening: (listening: boolean) => void;
  setMicTimer: (timer: number) => void;
  setTranscript: (transcript: string) => void;
  setInterimTranscript: (interim: string) => void;
  resetMic: () => void;
  
  // Actions - Conversations
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessageToCurrentConversation: (message: ConversationMessage) => void;
  
  // Actions - UI
  setModalOpen: (open: boolean, type?: ModalType) => void;
  setShowIndicators: (show: boolean) => void;
  setFirstVisit: (first: boolean) => void;
  setSplashComplete: (complete: boolean) => void;
  
  
  // Actions - Health
  setHealthAnswer: (key: string, value: string) => void;
  clearHealthAnswers: () => void;
  
  // Actions - Ideas
  setIdeaContent: (content: string) => void;
  addCritique: (critique: string) => void;
  clearIdea: () => void;
  
  // Actions - Preferences
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  
  // Reset
  reset: () => void;
  resetSession: () => void;
}

export const usePWAVoiceStore = create<PWAVoiceStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Auth Actions
      setAuthenticated: (auth, fingerprint, userId, name) =>
        set({
          isAuthenticated: auth,
          deviceFingerprint: fingerprint || null,
          userId: userId || null,
          userName: name || "",
        }),
      
      // App State Actions
      setAppState: (state) =>
        set((s) => ({
          appState: state,
          previousState: s.appState,
        })),
      
      setActiveModule: (module) =>
        set({
          activeModule: module,
          appState: module ? "module" : "idle",
        }),
      
      // Player Actions
      setPlayerState: (state) => set({ playerState: state }),
      setPlaying: (playing) =>
        set({
          isPlaying: playing,
          playerState: playing ? "playing" : "idle",
        }),
      setAudioProgress: (progress) => set({ audioProgress: progress }),
      setCurrentAudioUrl: (url) => set({ currentAudioUrl: url }),
      
      // Microphone Actions
      setMicState: (state) => set({ micState: state }),
      setMicVisible: (visible) =>
        set({
          isMicVisible: visible,
          micState: visible ? "emerging" : "hidden",
        }),
      setListening: (listening) =>
        set({
          isListening: listening,
          micState: listening ? "listening" : "hidden",
          appState: listening ? "listening" : get().previousState || "idle",
        }),
      setMicTimer: (timer) => set({ micTimer: timer }),
      setTranscript: (transcript) => set({ transcript }),
      setInterimTranscript: (interim) => set({ interimTranscript: interim }),
      resetMic: () =>
        set({
          micState: "hidden",
          isMicVisible: false,
          isListening: false,
          micTimer: 10,
          transcript: "",
          interimTranscript: "",
        }),
      
      // Conversation Actions
      addConversation: (conversation) =>
        set((s) => ({
          conversations: [conversation, ...s.conversations],
        })),
      
      updateConversation: (id, updates) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
          ),
        })),
      
      setCurrentConversation: (conversation) =>
        set({ currentConversation: conversation }),
      
      addMessageToCurrentConversation: (message) =>
        set((s) => {
          if (!s.currentConversation) return s;
          const updated = {
            ...s.currentConversation,
            messages: [...s.currentConversation.messages, message],
            updatedAt: new Date(),
          };
          return {
            currentConversation: updated,
            conversations: s.conversations.map((c) =>
              c.id === updated.id ? updated : c
            ),
          };
        }),
      
      // UI Actions
      setModalOpen: (open, type) =>
        set({
          isModalOpen: open,
          modalType: open ? type || null : null,
        }),
      setShowIndicators: (show) => set({ showIndicators: show }),
      setFirstVisit: (first) => set({ isFirstVisit: first }),
      setSplashComplete: (complete) => set({ isSplashComplete: complete }),
      
      
      // Health Actions
      setHealthAnswer: (key, value) =>
        set((s) => ({
          healthAnswers: { ...s.healthAnswers, [key]: value },
        })),
      clearHealthAnswers: () => set({ healthAnswers: {} }),
      
      // Ideas Actions
      setIdeaContent: (content) => set({ ideaContent: content }),
      addCritique: (critique) =>
        set((s) => ({
          ideaCritique: [...s.ideaCritique, critique],
        })),
      clearIdea: () => set({ ideaContent: "", ideaCritique: [] }),
      
      // Preferences Actions
      updatePreferences: (prefs) =>
        set((s) => ({
          userPreferences: { ...s.userPreferences, ...prefs },
        })),
      
      // Reset Actions
      reset: () => set(initialState),
      
      resetSession: () =>
        set({
          appState: "splash",
          previousState: null,
          activeModule: null,
          playerState: "idle",
          isPlaying: false,
          audioProgress: 0,
          currentAudioUrl: null,
          micState: "hidden",
          isMicVisible: false,
          isListening: false,
          micTimer: 10,
          transcript: "",
          interimTranscript: "",
          currentConversation: null,
          isModalOpen: false,
          modalType: null,
          healthAnswers: {},
          ideaContent: "",
          ideaCritique: [],
          isSplashComplete: false,
        }),
    }),
    {
      name: "pwa-voice-v2-storage",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        deviceFingerprint: state.deviceFingerprint,
        userId: state.userId,
        userName: state.userName,
        isFirstVisit: state.isFirstVisit,
        conversations: state.conversations,
        userPreferences: state.userPreferences,
      }),
    }
  )
);

// Selector hooks for common patterns
export const useAppState = () => usePWAVoiceStore((s) => s.appState);
export const usePlayerState = () => usePWAVoiceStore((s) => s.playerState);
export const useMicState = () => usePWAVoiceStore((s) => s.micState);
export const useActiveModule = () => usePWAVoiceStore((s) => s.activeModule);
export const useConversations = () => usePWAVoiceStore((s) => s.conversations);
export const useIsAuthenticated = () => usePWAVoiceStore((s) => s.isAuthenticated);
