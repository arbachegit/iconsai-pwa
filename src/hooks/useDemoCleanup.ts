import { useEffect } from "react";
import { useDemoMode } from "./useDemoMode";

/**
 * Hook para limpar dados quando aba de demo é fechada
 * - Demo Clean: limpa TUDO ao fechar
 * - Demo Seeded: mantém histórico (não limpa)
 */
export function useDemoCleanup() {
  const { isDemoMode, demoType } = useDemoMode();

  useEffect(() => {
    // Só fazer cleanup se for demo mode E demo clean
    if (!isDemoMode || demoType !== "clean") {
      return;
    }

    const handleBeforeUnload = () => {
      console.log("[Demo Cleanup] Limpando dados do demo clean...");

      // Limpar localStorage (históricos e configs)
      const keysToRemove = [
        "pwa-voice-v2-storage",
        "pwa-history-storage",
        "pwacity-verified-phone",
        "pwahealth-verified-phone",
        "pwa-auth-storage",
      ];

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });

      // Limpar TODO sessionStorage
      sessionStorage.clear();

      console.log("[Demo Cleanup] Limpeza completa realizada");
    };

    // Adicionar listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup do listener
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDemoMode, demoType]);

  // Também limpar no mount se detectar resquícios de demo anterior
  useEffect(() => {
    if (isDemoMode && demoType === "clean") {
      // Verificar se há dados antigos de demo
      const hasOldDemoData = sessionStorage.getItem("pwa-demo-cleaned");

      if (!hasOldDemoData) {
        console.log("[Demo Cleanup] Primeiro mount, garantindo limpeza");

        // Limpar dados antigos
        localStorage.removeItem("pwa-voice-v2-storage");
        localStorage.removeItem("pwa-history-storage");
        localStorage.removeItem("pwacity-verified-phone");
        localStorage.removeItem("pwahealth-verified-phone");

        // Marcar que já limpou nesta sessão
        sessionStorage.setItem("pwa-demo-cleaned", "true");
      }
    }
  }, [isDemoMode, demoType]);
}
