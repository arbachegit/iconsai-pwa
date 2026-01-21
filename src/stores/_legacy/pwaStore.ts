import { create } from "zustand";

export type AppState = "splash" | "home" | "module" | "conversation" | "summary";
export type ModuleId = "help" | "world" | "health" | "ideas" | null;
export type PlayerState = "idle" | "loading" | "playing" | "listening" | "processing";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UserPreferences {
  interests: string[];
  communicationStyle: "formal" | "informal" | "neutral";
  healthProfile: Record<string, string>;
}

// Estado inicial para reset
const initialState = {
  appState: "splash" as AppState,
  activeModule: null as ModuleId,
  playerState: "idle" as PlayerState,
  conversationHistory: [] as ConversationMessage[],
  userPreferences: {
    interests: [] as string[],
    communicationStyle: "neutral" as const,
    healthProfile: {} as Record<string, string>,
  },
  healthAnswers: {} as Record<string, string>,
  ideaContent: "",
  ideaCritique: [] as string[],
};

interface PWAStore {
  // Estado da aplicação
  appState: AppState;
  setAppState: (state: AppState) => void;
  
  // Módulo ativo
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
  
  // Estado do player
  playerState: PlayerState;
  setPlayerState: (state: PlayerState) => void;
  
  // Histórico de conversa
  conversationHistory: ConversationMessage[];
  addMessage: (role: "user" | "assistant", content: string) => void;
  clearHistory: () => void;
  
  // Preferências do usuário (aprendidas)
  userPreferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  
  // Health module state (OLDCARTS)
  healthAnswers: Record<string, string>;
  setHealthAnswer: (key: string, value: string) => void;
  clearHealthAnswers: () => void;
  
  // Ideas module state
  ideaContent: string;
  setIdeaContent: (content: string) => void;
  ideaCritique: string[];
  addCritique: (critique: string) => void;
  clearIdea: () => void;
  
  // Reset completo
  reset: () => void;
}

export const usePWAStore = create<PWAStore>((set) => ({
  appState: "splash",
  setAppState: (state) => set({ appState: state }),
  
  activeModule: null,
  setActiveModule: (module) => set({ activeModule: module }),
  
  playerState: "idle",
  setPlayerState: (state) => set({ playerState: state }),
  
  conversationHistory: [],
  addMessage: (role, content) => set((state) => ({
    conversationHistory: [...state.conversationHistory, { role, content, timestamp: new Date() }]
  })),
  clearHistory: () => set({ conversationHistory: [] }),
  
  userPreferences: {
    interests: [],
    communicationStyle: "neutral",
    healthProfile: {},
  },
  updatePreferences: (prefs) => set((state) => ({
    userPreferences: { ...state.userPreferences, ...prefs }
  })),
  
  healthAnswers: {},
  setHealthAnswer: (key, value) => set((state) => ({
    healthAnswers: { ...state.healthAnswers, [key]: value }
  })),
  clearHealthAnswers: () => set({ healthAnswers: {} }),
  
  ideaContent: "",
  setIdeaContent: (content) => set({ ideaContent: content }),
  ideaCritique: [],
  addCritique: (critique) => set((state) => ({
    ideaCritique: [...state.ideaCritique, critique]
  })),
  clearIdea: () => set({ ideaContent: "", ideaCritique: [] }),
  
  // Reset completo para estado inicial
  reset: () => set(initialState),
}));
