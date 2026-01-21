import { create } from "zustand";
import type { DemoType } from "@/hooks/useDemoMode";
import {
  PWA_SEED_DATA,
  PWACITY_SEED_DATA,
  PWAHEALTH_SEED_DATA,
  type DemoConversation,
  type DemoMessage,
} from "@/data/demoSeedData";

interface DemoUser {
  name: string;
  phone: string;
  sessionId: string;
}

interface SeededConversations {
  pwa: DemoConversation[];
  pwacity: DemoMessage[];
  pwahealth: DemoMessage[];
}

interface DemoState {
  // Estado do demo
  isDemoMode: boolean;
  demoType: DemoType;

  // User fake para demo
  demoUser: DemoUser;

  // Conversas seeded (pré-carregadas)
  seededConversations: SeededConversations;

  // Métodos
  initializeDemo: (type: DemoType) => void;
  clearDemo: () => void;
  isAuthenticated: () => boolean;
}

// User fake padrão para demos
const DEFAULT_DEMO_USER: DemoUser = {
  name: "Usuário Demo",
  phone: "+5511999999999",
  sessionId: `demo-${Date.now()}`,
};

export const useDemoStore = create<DemoState>((set, get) => ({
  // Estado inicial
  isDemoMode: false,
  demoType: null,
  demoUser: DEFAULT_DEMO_USER,
  seededConversations: {
    pwa: PWA_SEED_DATA,
    pwacity: PWACITY_SEED_DATA,
    pwahealth: PWAHEALTH_SEED_DATA,
  },

  // Inicializar modo demo
  initializeDemo: (type: DemoType) => {
    if (!type) return;

    console.log(`[Demo Store] Inicializando demo mode: ${type}`);

    // Gerar novo session ID para este demo
    const newDemoUser: DemoUser = {
      ...DEFAULT_DEMO_USER,
      sessionId: `demo-${type}-${Date.now()}`,
    };

    set({
      isDemoMode: true,
      demoType: type,
      demoUser: newDemoUser,
    });

    // Salvar em sessionStorage
    sessionStorage.setItem("pwa-demo-mode", type);
    sessionStorage.setItem("pwa-demo-user", JSON.stringify(newDemoUser));

    console.log(`[Demo Store] Demo inicializado com sucesso`, {
      type,
      user: newDemoUser,
    });
  },

  // Limpar modo demo
  clearDemo: () => {
    console.log("[Demo Store] Limpando demo mode");

    set({
      isDemoMode: false,
      demoType: null,
      demoUser: DEFAULT_DEMO_USER,
    });

    // Limpar sessionStorage
    sessionStorage.removeItem("pwa-demo-mode");
    sessionStorage.removeItem("pwa-demo-user");
  },

  // Verificar se está autenticado (sempre true em demo)
  isAuthenticated: () => {
    const state = get();
    return state.isDemoMode;
  },
}));
