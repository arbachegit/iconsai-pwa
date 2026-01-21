/**
 * ============================================================
 * PWAVoiceAssistant.tsx - v5.5.0
 * ============================================================
 * ARQUITETURA DE CONTAINERS INDEPENDENTES
 * - Cada container gerencia seu próprio autoplay
 * - Sem race conditions
 * - Sem refs compartilhadas
 * - SAFARI COMPATIBLE
 * - FIX: useEffect movido para componente separado (React hooks rules)
 * - NEW: MobileFrame para visualização desktop em formato celular
 * - NEW: Coleta de fingerprint do dispositivo
 * - NEW: Demo Mode Support
 * ============================================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { usePWAVoiceStore, ModuleId } from "@/stores/pwaVoiceStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useAudioManager } from "@/stores/audioManagerStore";
import { SplashScreen } from "./SplashScreen";
import { FooterModules } from "./_legacy/FooterModules";
import { HistoryScreen } from "./HistoryScreen";
import { useConfigPWA } from "@/hooks/useConfigPWA";
import { PWAAuthGate } from "@/components/gates/PWAAuthGate";
import SafariAudioUnlock from "@/components/pwa/SafariAudioUnlock";
import SafariPWAInstallPrompt from "@/components/pwa/SafariPWAInstallPrompt";
import { MobileFrame } from "@/components/pwa/MobileFrame";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useDemoStore } from "@/stores/demoStore";

// Containers independentes
import {
  HomeContainer,
  HealthModuleContainer,
  IdeasModuleContainer,
  WorldModuleContainer,
  HelpModuleContainer
} from "../containers";

// ============================================================
// COMPONENTE SEPARADO PARA CONTEÚDO AUTENTICADO
// (Necessário para usar hooks corretamente)
// ============================================================
interface AuthenticatedContentProps {
  userPhone: string;
  pwaAccess: string[];
  embedded: boolean;
}

const AuthenticatedContent: React.FC<AuthenticatedContentProps> = ({
  userPhone,
  pwaAccess,
  embedded
}) => {
  // DEMO MODE
  const { isDemoMode, demoType } = useDemoMode();
  const { seededConversations, demoUser } = useDemoStore();

  const {
    appState,
    setAppState,
    activeModule,
    setActiveModule,
    setPlayerState,
    setAuthenticated,
  } = usePWAVoiceStore();

  const { initialize: initializeHistory, addMessage } = useHistoryStore();
  const { config } = useConfigPWA();

  // Coletar fingerprint do dispositivo
  const { fingerprint: deviceFingerprint } = useDeviceFingerprint(userPhone);

  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [currentFingerprint, setCurrentFingerprint] = useState<string>("");

  // Inicializar com userPhone e fingerprint - HOOK VÁLIDO em componente React
  useEffect(() => {
    if (userPhone) {
      // Usar fingerprint do dispositivo ou fallback para userPhone
      const fpToUse = deviceFingerprint || userPhone;
      setCurrentFingerprint(fpToUse);
      setAuthenticated(true, userPhone);
      initializeHistory(userPhone);

      console.log("[PWA v5.5.0] Authenticated with fingerprint:", fpToUse.substring(0, 20) + "...");
    }
  }, [userPhone, deviceFingerprint, setAuthenticated, initializeHistory]);

  // Carregar histórico seeded se demo=seeded
  useEffect(() => {
    if (isDemoMode && demoType === "seeded" && userPhone) {
      console.log("[PWA] Carregando histórico seeded para demo");

      // Popular historyStore com conversas fake
      seededConversations.pwa.forEach((msg) => {
        addMessage("home", {
          role: msg.role,
          content: msg.content,
          audioUrl: null,
        });
      });
    }
  }, [isDemoMode, demoType, seededConversations.pwa, userPhone, addMessage]);

  const handleSplashComplete = useCallback(() => {
    setAppState("idle");
  }, [setAppState]);

  const handleModuleSelect = useCallback((moduleId: Exclude<ModuleId, null>) => {
    console.log("[PWA] Navegando para módulo:", moduleId);
    useAudioManager.getState().stopAllAndCleanup();
    setActiveModule(moduleId);
  }, [setActiveModule]);

  const handleBackToHome = useCallback(() => {
    console.log("[PWA] Voltando para HOME");
    useAudioManager.getState().stopAllAndCleanup();
    setActiveModule(null);
    setAppState("idle");
    setPlayerState("idle");
  }, [setActiveModule, setAppState, setPlayerState]);

  const handleOpenHistoryFromModule = useCallback(() => {
    setIsConversationsOpen(true);
  }, []);

  const renderModuleContainer = () => {
    const commonProps = {
      onBack: handleBackToHome,
      onHistoryClick: handleOpenHistoryFromModule,
      deviceId: currentFingerprint,
    };

    switch (activeModule) {
      case "health":
        return <HealthModuleContainer {...commonProps} />;
      case "ideas":
        return <IdeasModuleContainer {...commonProps} />;
      case "world":
        return <WorldModuleContainer {...commonProps} />;
      case "help":
        return <HelpModuleContainer {...commonProps} />;
      default:
        return null;
    }
  };

  const wrapperClass = embedded
    ? "absolute inset-0 bg-background flex flex-col pwa-no-select overflow-hidden"
    : "fixed inset-0 bg-background flex flex-col pwa-no-select pwa-fullscreen overflow-hidden touch-none";

  return (
    <div className={wrapperClass}>
      <SafariAudioUnlock />
      <SafariPWAInstallPrompt />
      <AnimatePresence mode="wait">
        {appState === "splash" && (
          <SplashScreen
            key="splash"
            onComplete={handleSplashComplete}
            embedded={embedded}
            duration={config.splashDurationMs || 3000}
          />
        )}

        {(appState === "idle" || appState === "welcome") && !activeModule && (
          <HomeContainer
            key="home"
            onModuleSelect={handleModuleSelect}
            deviceId={currentFingerprint}
          />
        )}

        {activeModule && (
          <motion.div
            key={`module-${activeModule}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-hidden">
              {renderModuleContainer()}
            </div>
            <FooterModules
              activeModule={activeModule}
              onSelectModule={handleModuleSelect}
              showIndicators={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isConversationsOpen && (
        <HistoryScreen
          onBack={() => setIsConversationsOpen(false)}
          filterModule={activeModule || undefined}
          deviceId={currentFingerprint}
        />
      )}
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL - PWAVoiceAssistant
// ============================================================
interface PWAVoiceAssistantProps {
  embedded?: boolean;
}

export const PWAVoiceAssistant: React.FC<PWAVoiceAssistantProps> = ({ embedded = false }) => {
  const [showDesktopWarning, setShowDesktopWarning] = useState(false);
  const [allowDesktopFromConfig, setAllowDesktopFromConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(false);

  // Lock scroll
  useEffect(() => {
    if (embedded) return;
    document.documentElement.classList.add("pwa-scroll-lock");
    document.body.classList.add("pwa-scroll-lock");
    return () => {
      document.documentElement.classList.remove("pwa-scroll-lock");
      document.body.classList.remove("pwa-scroll-lock");
    };
  }, [embedded]);

  // Load desktop access config from database
  useEffect(() => {
    const loadDesktopConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("pwa_config")
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        if (!error && data?.config_value === "true") {
          console.log("[PWAVoiceAssistant] allow_desktop_access = true (from config)");
          setAllowDesktopFromConfig(true);
        }
      } catch (err) {
        console.log("[PWAVoiceAssistant] Config not found, using default");
      } finally {
        setConfigLoaded(true);
      }
    };

    loadDesktopConfig();
  }, []);

  // Check mobile - now respects allow_desktop_access config
  useEffect(() => {
    if (!configLoaded) return; // Wait for config to load

    if (embedded) {
      setShowDesktopWarning(false);
      setIsDesktopView(false);
      return;
    }

    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      // Only show desktop warning if NOT mobile AND config doesn't allow desktop
      setShowDesktopWarning(!mobile && !allowDesktopFromConfig);
      // Set desktop view for MobileFrame
      setIsDesktopView(!mobile && allowDesktopFromConfig);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [embedded, allowDesktopFromConfig, configLoaded]);

  // Loading state while config loads
  if (!configLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showDesktopWarning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <Smartphone className="w-12 h-12 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Acesse pelo celular</h1>
          <p className="text-muted-foreground mb-6">
            O KnowYOU Voice Assistant foi projetado para dispositivos móveis. Acesse{" "}
            <span className="text-primary font-medium">hmv.knowyou.app</span> pelo seu celular.
          </p>
        </motion.div>
      </div>
    );
  }

  if (embedded) {
    return (
      <AuthenticatedContent
        userPhone="simulator-embedded"
        pwaAccess={["pwa", "help", "health", "world", "ideas"]}
        embedded={embedded}
      />
    );
  }

  // Desktop view with MobileFrame wrapper
  if (isDesktopView) {
    return (
      <MobileFrame>
        <PWAAuthGate>
          {(data) => (
            <AuthenticatedContent
              userPhone={data.userPhone}
              pwaAccess={data.pwaAccess}
              embedded={true}
            />
          )}
        </PWAAuthGate>
      </MobileFrame>
    );
  }

  // Mobile view - full screen
  return (
    <PWAAuthGate>
      {(data) => (
        <AuthenticatedContent
          userPhone={data.userPhone}
          pwaAccess={data.pwaAccess}
          embedded={embedded}
        />
      )}
    </PWAAuthGate>
  );
};

export default PWAVoiceAssistant;
