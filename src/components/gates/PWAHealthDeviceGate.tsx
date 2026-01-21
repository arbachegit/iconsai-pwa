// =============================================
// PWA Health Device Gate v1.1
// Build: 2026-01-17
// Tabelas: pwahealth_config, user_roles
// src/components/gates/PWAHealthDeviceGate.tsx
// Demo Mode Support
//
// REGRAS:
// - Mobile: sempre permite (via PWAHealthAuthGate)
// - Desktop:
//   - Demo Mode: sempre permite (bypass total)
//   - Admin/SuperAdmin + toggle true = permite
//   - Usuário comum = NUNCA permite (independente do toggle)
//   - Sem toggle = bloqueia todos
// =============================================

import { ReactNode, useState, useEffect } from "react";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useDemoMode } from "@/hooks/useDemoMode";
import { supabase } from "@/integrations/supabase/client";
import PWAHealthDesktopBlock from "./PWAHealthDesktopBlock";

interface PWAHealthDeviceGateProps {
  children: ReactNode;
}

const PWAHealthDeviceGate = ({ children }: PWAHealthDeviceGateProps) => {
  const { isMobile, isDesktop, isTablet } = useDeviceDetection();
  const { isDemoMode } = useDemoMode();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [allowDesktopFromConfig, setAllowDesktopFromConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // DEMO MODE: Bypass total de verificações
  // Carregar config allow_desktop_access do banco (tabela pwahealth_config)
  useEffect(() => {
    // Se demo mode, não carregar config do banco
    if (isDemoMode) {
      console.log("[PWAHealthDeviceGate] Demo mode detectado, pulando carregamento de config");
      setConfigLoaded(true);
      return;
    }

    const loadDesktopConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("pwahealth_config")
          .select("config_value")
          .eq("config_key", "allow_desktop_access")
          .single();

        if (!error && data?.config_value === "true") {
          console.log("[PWAHealthDeviceGate] allow_desktop_access = true (from pwahealth_config)");
          setAllowDesktopFromConfig(true);
        } else {
          console.log("[PWAHealthDeviceGate] allow_desktop_access = false (default)");
          setAllowDesktopFromConfig(false);
        }
      } catch (err) {
        console.log("[PWAHealthDeviceGate] Config not found, using default (block desktop)");
        setAllowDesktopFromConfig(false);
      } finally {
        setConfigLoaded(true);
      }
    };

    loadDesktopConfig();
  }, [isDemoMode]);

  // Verificar role do usuário
  useEffect(() => {
    // Se demo mode, não verificar role
    if (isDemoMode) {
      console.log("[PWAHealthDeviceGate] Demo mode detectado, pulando verificação de role");
      setCheckingRole(false);
      return;
    }

    const checkUserRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log("[PWAHealthDeviceGate] No authenticated user");
          setUserRole(null);
          setCheckingRole(false);
          return;
        }

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        const role = roleData?.role || "user";
        console.log("[PWAHealthDeviceGate] User role:", role);
        setUserRole(role);
      } catch (error) {
        console.error("[PWAHealthDeviceGate] Error checking user role:", error);
        setUserRole("user"); // Default to user on error
      } finally {
        setCheckingRole(false);
      }
    };

    checkUserRole();
  }, [isDemoMode]);

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Aguardar role e config carregarem
  if (checkingRole || !configLoaded) {
    return <LoadingSpinner />;
  }

  // Verificar se é dispositivo iOS (sempre permite, independente de desktop/mobile)
  const isIOSDevice =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isIOSDevice) {
    console.log("[PWAHealthDeviceGate] iOS device detected, allowing access");
    return <>{children}</>;
  }

  // MOBILE ou TABLET: sempre permite (autenticação via PWAHealthAuthGate)
  if (isMobile || isTablet) {
    console.log("[PWAHealthDeviceGate] Mobile/Tablet access allowed");
    return <>{children}</>;
  }

  // DESKTOP: aplicar regras especiais
  if (isDesktop) {
    // BYPASS: Demo mode sempre permite desktop
    if (isDemoMode) {
      console.log("[PWAHealthDeviceGate] Demo mode bypass: allowing desktop access");
      return <>{children}</>;
    }


    const isAdminOrSuperAdmin = userRole === "admin" || userRole === "superadmin";

    // REGRA CRÍTICA: Usuários comuns NUNCA podem acessar no desktop
    if (!isAdminOrSuperAdmin) {
      console.log("[PWAHealthDeviceGate] Blocking desktop: user role is 'user' (only admin/superadmin allowed)");
      return (
        <PWAHealthDesktopBlock
          customMessage="Knowyou AI Saúde está disponível apenas em dispositivos móveis para usuários."
          customTitle="Acesso Restrito"
        />
      );
    }

    // Admin/SuperAdmin: verificar toggle
    if (isAdminOrSuperAdmin && allowDesktopFromConfig) {
      console.log("[PWAHealthDeviceGate] Allowing desktop: admin/superadmin + toggle enabled");
      return <>{children}</>;
    }

    // Admin/SuperAdmin mas toggle desabilitado
    console.log("[PWAHealthDeviceGate] Blocking desktop: toggle disabled (even for admin)");
    return (
      <PWAHealthDesktopBlock
        customMessage="O acesso desktop ao PWA Health está desabilitado. Ative o toggle em Config. PWA."
        customTitle="Desktop Desabilitado"
      />
    );
  }

  // Default: permitir
  return <>{children}</>;
};

export default PWAHealthDeviceGate;
