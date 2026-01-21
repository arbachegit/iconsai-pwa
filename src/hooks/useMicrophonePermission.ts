/**
 * ============================================================
 * hooks/useMicrophonePermission.ts
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Microfone_objeto.zip
 * Hook para gerenciar permissao do microfone
 * ============================================================
 */

import { useState, useEffect, useCallback } from "react";

export type PermissionStatus = "prompt" | "granted" | "denied" | "unsupported";

interface UseMicrophonePermissionReturn {
  status: PermissionStatus;
  isGranted: boolean;
  isDenied: boolean;
  isPrompt: boolean;
  isUnsupported: boolean;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<PermissionStatus>;
}

export function useMicrophonePermission(): UseMicrophonePermissionReturn {
  const [status, setStatus] = useState<PermissionStatus>("prompt");

  // Verificar se o navegador suporta
  const isSupported =
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  // Verificar permissao atual
  const checkPermission = useCallback(async (): Promise<PermissionStatus> => {
    if (!isSupported) {
      setStatus("unsupported");
      return "unsupported";
    }

    try {
      // Usar Permissions API se disponivel
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
        const newStatus = result.state as PermissionStatus;
        setStatus(newStatus);
        return newStatus;
      }

      // Fallback: tentar acessar o microfone brevemente
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setStatus("granted");
      return "granted";
    } catch (error) {
      const err = error as Error;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("denied");
        return "denied";
      }
      setStatus("prompt");
      return "prompt";
    }
  }, [isSupported]);

  // Solicitar permissao
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn("[useMicrophonePermission] Navegador nao suporta microfone");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setStatus("granted");
      return true;
    } catch (error) {
      const err = error as Error;
      console.error("[useMicrophonePermission] Erro ao solicitar permissao:", err);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("denied");
      }
      return false;
    }
  }, [isSupported]);

  // Verificar permissao na montagem
  useEffect(() => {
    if (!isSupported) {
      setStatus("unsupported");
      return;
    }

    checkPermission();

    // Observar mudancas de permissao
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((permissionStatus) => {
          permissionStatus.onchange = () => {
            setStatus(permissionStatus.state as PermissionStatus);
          };
        })
        .catch(() => {
          // Ignorar erro se Permissions API nao estiver disponivel
        });
    }
  }, [isSupported, checkPermission]);

  return {
    status,
    isGranted: status === "granted",
    isDenied: status === "denied",
    isPrompt: status === "prompt",
    isUnsupported: status === "unsupported",
    requestPermission,
    checkPermission,
  };
}

export default useMicrophonePermission;
