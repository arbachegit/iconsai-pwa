// =============================================
// PWA City Auth Hook v1.0
// Build: 2026-01-17
// Funções: login_pwacity, verify_pwacity_code, check_pwacity_access
// Tabelas: pwacity_invites, pwacity_sessions
// src/hooks/usePWACityAuth.ts
// =============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "pwacity-verified-phone";

export type PWACityAuthStatus =
  | "loading"
  | "verified"
  | "blocked"
  | "needs_login"
  | "needs_verification"
  | "sending_code"
  | "error";

export type CodeSentChannel = "whatsapp" | "sms" | null;

interface PWACityAuthState {
  status: PWACityAuthStatus;
  userName: string | null;
  userPhone: string | null;
  blockReason: string | null;
  errorMessage: string | null;
  codeSentVia: CodeSentChannel;
  codeSentError: string | null;
  resendingCode: boolean;
  sessionId: string | null;
}

interface LoginParams {
  phone: string;
}

interface VerifyParams {
  code: string;
}

/**
 * Hook para autenticação PWA City
 * Usa telefone verificado no localStorage como sessão
 * Separado do PWA principal
 */
export function usePWACityAuth() {
  const [state, setState] = useState<PWACityAuthState>({
    status: "loading",
    userName: null,
    userPhone: null,
    blockReason: null,
    errorMessage: null,
    codeSentVia: null,
    codeSentError: null,
    resendingCode: false,
    sessionId: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Verificar status de acesso usando telefone do localStorage
   */
  const checkAccess = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));

      const verifiedPhone = localStorage.getItem(STORAGE_KEY);

      console.log("[PWA City Auth v1.0] Checking access...");
      console.log("[PWA City Auth v1.0] Verified phone:", verifiedPhone ? verifiedPhone.substring(0, 8) + "..." : "none");

      if (!verifiedPhone) {
        console.log("[PWA City Auth v1.0] No verified phone -> needs_login");
        setState((prev) => ({ ...prev, status: "needs_login" }));
        return;
      }

      // Verificar acesso via RPC
      const { data, error } = await supabase.rpc("check_pwacity_access", {
        p_phone: verifiedPhone,
      });

      console.log("[PWA City Auth v1.0] check_pwacity_access response:", { data, error });

      if (error) {
        console.error("[PWA City Auth v1.0] RPC Error:", error);
        localStorage.removeItem(STORAGE_KEY);
        setState((prev) => ({
          ...prev,
          status: "needs_login",
          errorMessage: "Erro ao verificar acesso. Faça login novamente.",
        }));
        return;
      }

      const result = data as {
        has_access: boolean;
        user_name?: string;
        session_id?: string;
        error?: string;
      };

      if (result.has_access) {
        console.log("[PWA City Auth v1.0] Status: VERIFIED ✅");
        setState((prev) => ({
          ...prev,
          status: "verified",
          userName: result.user_name || null,
          userPhone: verifiedPhone,
          sessionId: result.session_id || null,
        }));
        return;
      }

      // Sem acesso - precisa fazer login
      console.log("[PWA City Auth v1.0] No access -> needs_login");
      localStorage.removeItem(STORAGE_KEY);
      setState((prev) => ({ ...prev, status: "needs_login" }));
    } catch (err) {
      console.error("[PWA City Auth v1.0] Unexpected error:", err);
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: "Erro inesperado. Tente novamente.",
      }));
    }
  }, []);

  /**
   * Login por telefone
   */
  const login = useCallback(
    async (params: LoginParams): Promise<{ success: boolean; error?: string }> => {
      console.log("[PWA City Auth v1.0] ===== LOGIN START =====");
      console.log("[PWA City Auth v1.0] Phone:", params.phone);

      if (isSubmitting) {
        return { success: false, error: "Operação em andamento" };
      }

      setIsSubmitting(true);

      try {
        // Chamar função login_pwacity
        const { data, error } = await supabase.rpc("login_pwacity", {
          p_phone: params.phone,
        });

        console.log("[PWA City Auth v1.0] login_pwacity response:", { data, error });

        if (error) {
          console.error("[PWA City Auth v1.0] RPC ERROR:", error.message);
          return { success: false, error: error.message };
        }

        const result = data as {
          success: boolean;
          verification_code?: string;
          user_name?: string;
          phone?: string;
          session_id?: string;
          error?: string;
        };

        if (!result.success) {
          console.log("[PWA City Auth v1.0] Login failed:", result.error);
          return { success: false, error: result.error || "Erro ao fazer login" };
        }

        // Atualizar estado para envio de código
        const normalizedPhone = result.phone || params.phone;
        setState((prev) => ({
          ...prev,
          status: "sending_code",
          userPhone: normalizedPhone,
          userName: result.user_name || null,
          sessionId: result.session_id || null,
          codeSentVia: null,
          codeSentError: null,
        }));

        // Enviar SMS com código
        let sentChannel: CodeSentChannel = null;

        if (result.verification_code) {
          try {
            console.log("[PWA City Auth v1.0] Enviando SMS...");

            const smsMessage = `KnowYOU PWA City: Seu codigo de verificacao: ${result.verification_code}. Valido por 10 minutos.`;

            const { data: smsResult, error: smsError } = await supabase.functions.invoke("send-sms", {
              body: {
                phoneNumber: normalizedPhone,
                message: smsMessage,
                eventType: "pwacity_otp",
              },
            });

            console.log("[PWA City Auth v1.0] SMS response:", smsResult);

            if (!smsError && smsResult?.success) {
              sentChannel = "sms";
              console.log("[PWA City Auth v1.0] ✅ SMS enviado via:", smsResult.provider);
            } else {
              console.warn("[PWA City Auth v1.0] SMS falhou:", smsError || smsResult?.error);
            }
          } catch (smsErr) {
            console.error("[PWA City Auth v1.0] SMS exception:", smsErr);
          }
        }

        // Atualizar para tela de verificação
        setState((prev) => ({
          ...prev,
          status: "needs_verification",
          codeSentVia: sentChannel,
          codeSentError: sentChannel ? null : "Não foi possível enviar o código. Tente reenviar.",
        }));

        return { success: true };
      } catch (err) {
        console.error("[PWA City Auth v1.0] Login exception:", err);
        return { success: false, error: "Erro inesperado. Tente novamente." };
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting],
  );

  /**
   * Verificar código
   */
  const verify = useCallback(
    async (params: VerifyParams): Promise<{ success: boolean; error?: string }> => {
      console.log("[PWA City Auth v1.0] ===== VERIFY START =====");

      if (isSubmitting) return { success: false, error: "Operação em andamento" };

      setIsSubmitting(true);

      try {
        const phone = state.userPhone;

        if (!phone) {
          return { success: false, error: "Telefone não encontrado. Faça login novamente." };
        }

        console.log("[PWA City Auth v1.0] Verifying code for phone:", phone.substring(0, 8) + "...");

        // Chamar função verify_pwacity_code
        const { data, error } = await supabase.rpc("verify_pwacity_code", {
          p_phone: phone,
          p_code: params.code,
        });

        console.log("[PWA City Auth v1.0] verify_pwacity_code response:", { data, error });

        if (error) {
          console.error("[PWA City Auth v1.0] Verify error:", error);
          return { success: false, error: error.message };
        }

        const result = data as {
          success: boolean;
          user_name?: string;
          expires_at?: string;
          session_id?: string;
          error?: string;
        };

        if (!result.success) {
          if (result.error === "Código inválido") {
            return { success: false, error: "Código inválido. Tente novamente." };
          }
          if (result.error === "Código expirado ou sessão não encontrada") {
            return { success: false, error: "Código expirado. Solicite um novo código." };
          }
          if (result.error === "Muitas tentativas. Solicite um novo código.") {
            setState((prev) => ({ ...prev, status: "blocked", blockReason: "Excesso de tentativas" }));
            return { success: false, error: "Bloqueado por excesso de tentativas." };
          }
          return { success: false, error: result.error || "Código inválido" };
        }

        // SUCESSO! Salvar telefone no localStorage
        console.log("[PWA City Auth v1.0] ✅ Verification SUCCESS!");
        localStorage.setItem(STORAGE_KEY, phone);

        // Enviar mensagem de boas-vindas
        try {
          const userName = result.user_name || state.userName || "Usuário";
          const welcomeMessage = `KnowYOU PWA City: Ola ${userName}! Bem-vindo ao PWA City. Acesse: https://pwa.iconsai.ai/pwacity`;

          await supabase.functions.invoke("send-sms", {
            body: {
              phoneNumber: phone,
              message: welcomeMessage,
              eventType: "pwacity_welcome",
            },
          });
          console.log("[PWA City Auth v1.0] Welcome message sent");
        } catch (welcomeErr) {
          console.warn("[PWA City Auth v1.0] Failed to send welcome message:", welcomeErr);
        }

        // Atualizar estado
        setState((prev) => ({
          ...prev,
          status: "verified",
          userName: result.user_name || prev.userName,
          sessionId: result.session_id || prev.sessionId,
        }));

        return { success: true };
      } catch (err) {
        console.error("[PWA City Auth v1.0] Verify exception:", err);
        return { success: false, error: "Erro inesperado. Tente novamente." };
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, state.userPhone, state.userName],
  );

  /**
   * Reenviar código de verificação
   */
  const resendCode = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (state.resendingCode) return { success: false, error: "Operação em andamento" };

    setState((prev) => ({ ...prev, resendingCode: true, codeSentError: null }));

    try {
      const phone = state.userPhone;

      if (!phone) {
        setState((prev) => ({ ...prev, resendingCode: false }));
        return { success: false, error: "Telefone não encontrado" };
      }

      // Chamar login_pwacity para gerar novo código
      const { data, error } = await supabase.rpc("login_pwacity", {
        p_phone: phone,
      });

      if (error) {
        setState((prev) => ({ ...prev, resendingCode: false, codeSentError: error.message }));
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        verification_code?: string;
        phone?: string;
        error?: string;
      };

      if (!result.success) {
        setState((prev) => ({ ...prev, resendingCode: false, codeSentError: result.error || "Erro ao reenviar" }));
        return { success: false, error: result.error || "Erro ao reenviar código" };
      }

      // Enviar SMS
      let sentChannel: CodeSentChannel = null;
      const normalizedPhone = result.phone || phone;

      if (result.verification_code) {
        try {
          console.log("[PWA City Auth v1.0] Reenviando código via SMS...");

          const smsMessage = `KnowYOU PWA City: Seu codigo de verificacao: ${result.verification_code}. Valido por 10 minutos.`;

          const { data: smsResult, error: smsError } = await supabase.functions.invoke("send-sms", {
            body: {
              phoneNumber: normalizedPhone,
              message: smsMessage,
              eventType: "pwacity_otp_resend",
            },
          });

          console.log("[PWA City Auth v1.0] Resend response:", smsResult);

          if (!smsError && smsResult?.success) {
            sentChannel = "sms";
            console.log("[PWA City Auth v1.0] ✅ Código reenviado via:", smsResult.provider);
          } else {
            setState((prev) => ({
              ...prev,
              resendingCode: false,
              codeSentError: "Não foi possível reenviar o código.",
            }));
            return { success: false, error: "Falha ao reenviar código" };
          }
        } catch (err) {
          console.warn("[PWA City Auth v1.0] Error resending code:", err);
          setState((prev) => ({ ...prev, resendingCode: false, codeSentError: "Erro ao reenviar" }));
          return { success: false, error: "Erro ao reenviar código" };
        }
      }

      setState((prev) => ({
        ...prev,
        resendingCode: false,
        codeSentVia: sentChannel,
        codeSentError: null,
      }));

      return { success: true };
    } catch (err) {
      setState((prev) => ({ ...prev, resendingCode: false, codeSentError: "Erro inesperado" }));
      return { success: false, error: "Erro inesperado" };
    }
  }, [state.resendingCode, state.userPhone]);

  /**
   * Voltar para tela de login
   */
  const backToLogin = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: "needs_login",
      codeSentVia: null,
      codeSentError: null,
    }));
  }, []);

  /**
   * Logout - limpar localStorage e voltar para login
   */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({
      ...prev,
      status: "needs_login",
      userName: null,
      userPhone: null,
      sessionId: null,
    }));
  }, []);

  /**
   * Refresh - verificar acesso novamente
   */
  const refresh = useCallback(() => {
    checkAccess();
  }, [checkAccess]);

  // Verificar acesso ao montar
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    // Estado
    status: state.status,
    userName: state.userName,
    userPhone: state.userPhone,
    sessionId: state.sessionId,
    blockReason: state.blockReason,
    errorMessage: state.errorMessage,
    codeSentVia: state.codeSentVia,
    codeSentError: state.codeSentError,
    resendingCode: state.resendingCode,
    isSubmitting,

    // Ações
    login,
    verify,
    resendCode,
    backToLogin,
    logout,
    refresh,
  };
}

export default usePWACityAuth;
