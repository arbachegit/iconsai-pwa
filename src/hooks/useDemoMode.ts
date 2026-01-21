import { useState, useEffect } from "react";

export type DemoType = "clean" | "seeded" | null;

export interface DemoModeState {
  isDemoMode: boolean;
  demoType: DemoType;
}

/**
 * Hook para detectar se a aplicação está em modo demonstração
 * Verifica os query params ?demo=clean ou ?demo=seeded
 */
export function useDemoMode(): DemoModeState {
  // Detectar IMEDIATAMENTE, sem esperar useEffect
  const params = new URLSearchParams(window.location.search);
  const demoParam = params.get("demo");
  const storedDemo = sessionStorage.getItem("pwa-demo-mode");

  const initialDemoMode =
    (demoParam === "clean" || demoParam === "seeded") ? demoParam :
    (storedDemo === "clean" || storedDemo === "seeded") ? storedDemo :
    null;

  const [demoMode, setDemoMode] = useState<DemoModeState>({
    isDemoMode: !!initialDemoMode,
    demoType: initialDemoMode,
  });

  useEffect(() => {
    // Verificar URL params
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get("demo");

    console.log("[useDemoMode] URL:", window.location.href);
    console.log("[useDemoMode] Param demo:", demoParam);

    if (demoParam === "clean" || demoParam === "seeded") {
      console.log(`[useDemoMode] ✅ DEMO MODE ATIVADO: ${demoParam}`);

      setDemoMode({
        isDemoMode: true,
        demoType: demoParam,
      });

      // Salvar em sessionStorage
      sessionStorage.setItem("pwa-demo-mode", demoParam);
    } else {
      // Verificar sessionStorage
      const storedDemo = sessionStorage.getItem("pwa-demo-mode");
      console.log("[useDemoMode] SessionStorage:", storedDemo);

      if (storedDemo === "clean" || storedDemo === "seeded") {
        console.log(`[useDemoMode] ✅ DEMO MODE (from session): ${storedDemo}`);
        setDemoMode({
          isDemoMode: true,
          demoType: storedDemo,
        });
      } else {
        console.log("[useDemoMode] ❌ Modo normal (sem demo)");
      }
    }
  }, []);

  console.log("[useDemoMode] Retornando:", demoMode);
  return demoMode;
}
