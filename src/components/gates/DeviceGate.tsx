// =============================================
// Device Gate v2.1 - Com toggle allow_desktop_access + Demo Mode
// Build: 2026-01-17
// Tabelas: pwa_config, user_roles
// src/components/gates/DeviceGate.tsx
// Demo Mode Bypass Support
// =============================================

import { ReactNode, useState, useEffect } from "react";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useDemoMode } from "@/hooks/useDemoMode";
import { supabase } from "@/integrations/supabase/client";
import PWADesktopBlock from "./PWADesktopBlock";
import { MobilePlatformView } from "../mobile/MobilePlatformView";

interface DeviceGateProps {
  children: ReactNode;
  allowMobile?: boolean;
  allowDesktop?: boolean;
  allowTablet?: boolean;
  mobileShowChat?: boolean;
}

const DeviceGate = ({
  children,
  allowMobile = true,
  allowDesktop = true,
  allowTablet = true,
  mobileShowChat = false,
}: DeviceGateProps) => {
  const { isMobile, isDesktop, isTablet } = useDeviceDetection();
  const { isDemoMode } = useDemoMode();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [allowDesktopFromConfig, setAllowDesktopFromConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  console.log("[DeviceGate] isDemoMode:", isDemoMode, "| isDesktop:", isDesktop, "| allowDesktop:", allowDesktop);

  // DEMO MODE: Bypass total - permite qualquer dispositivo
  if (isDemoMode) {
    console.log("[DeviceGate] ✅ DEMO MODE BYPASS - Permitindo acesso");
    return <>{children}</>;
  }

  // Carregar config allow_desktop_access do banco
  useEffect(() => {
    const loadDesktopConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("pwa_config")
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        if (!error && data?.config_value === "true") {
          console.log("[DeviceGate] allow_desktop_access = true (from config)");
          setAllowDesktopFromConfig(true);
        }
      } catch (err) {
        console.log("[DeviceGate] Config not found, using default (block desktop)");
      } finally {
        setConfigLoaded(true);
      }
    };

    loadDesktopConfig();
  }, []);

  // Verificar se é admin quando em mobile
  useEffect(() => {
    if (!isMobile && !isTablet) {
      setCheckingRole(false);
      return;
    }

    const checkAdminRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          setCheckingRole(false);
          return;
        }

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "superadmin"])
          .maybeSingle();

        setIsAdmin(!!roleData);
      } catch (error) {
        console.error("[DeviceGate] Error checking admin role:", error);
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkAdminRole();
  }, [isMobile, isTablet]);

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Aguardar config carregar para decisão de desktop
  if (isDesktop && !configLoaded) {
    return <LoadingSpinner />;
  }

  // Tablet segue a configuração de allowTablet, se não permitido trata como mobile
  if (isTablet && !allowTablet) {
    if (!allowMobile) {
      if (checkingRole) {
        return <LoadingSpinner />;
      }
      return <MobilePlatformView isAdmin={isAdmin} />;
    }
  }

  // Mobile tentando acessar rota com mobileShowChat ativo
  if (isMobile && mobileShowChat) {
    if (checkingRole) {
      return <LoadingSpinner />;
    }
    return <MobilePlatformView isAdmin={isAdmin} />;
  }

  // Mobile tentando acessar rota só desktop (comportamento antigo - agora mostra chat)
  if (isMobile && !allowMobile) {
    if (checkingRole) {
      return <LoadingSpinner />;
    }
    return <MobilePlatformView isAdmin={isAdmin} />;
  }

  // Desktop tentando acessar rota só mobile (PWA)
  // CRITICAL FIX: NEVER block iOS devices with PWADesktopBlock
  const isIOSDevice = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Permitir desktop se:
  // 1. allowDesktop prop é true, OU
  // 2. allowDesktopFromConfig é true (toggle do banco), OU
  // 3. É dispositivo iOS
  if (isDesktop && !allowDesktop && !isIOSDevice && !allowDesktopFromConfig) {
    console.log("[DeviceGate] Blocking desktop access (config: allow_desktop_access = false)");
    return <PWADesktopBlock />;
  }

  return <>{children}</>;
};

export default DeviceGate;
