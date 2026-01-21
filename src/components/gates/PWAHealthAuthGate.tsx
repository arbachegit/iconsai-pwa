// =============================================
// PWA Health Auth Gate v1.1
// Build: 2026-01-17
// Telefone como identificador (sistema separado)
// Demo Mode Support
// =============================================

import { ReactNode, useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Heart, Phone, ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePWAHealthAuth, CodeSentChannel } from "@/hooks/usePWAHealthAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useDemoStore } from "@/stores/demoStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast as sonnerToast } from "sonner";

interface PWAHealthAuthGateProps {
  children: ReactNode | ((data: { userName: string | null; userPhone: string | null; sessionId: string | null; logout: () => void }) => ReactNode);
}

// Componente de feedback de envio
function CodeSentFeedback({
  channel,
  error
}: {
  channel: CodeSentChannel;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 p-3 rounded-lg mb-4">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (channel === 'sms') {
    return (
      <div className="flex items-center gap-2 bg-rose-500/10 text-rose-500 p-3 rounded-lg mb-4">
        <Heart className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">Código enviado via SMS</span>
        <CheckCircle2 className="h-4 w-4 ml-auto" />
      </div>
    );
  }

  return null;
}

// Tela de Login
function LoginScreen({
  onLogin,
  isSubmitting,
}: {
  onLogin: (params: { phone: string }) => Promise<{ success: boolean; error?: string }>;
  isSubmitting: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (phone.trim()) {
      const result = await onLogin({ phone: phone.trim() });
      if (!result.success && result.error) {
        setError(result.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-rose-500/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-8 w-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Knowyou AI Saúde</h1>
          <p className="text-slate-400 text-sm">
            Digite seu telefone para acessar
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={isSubmitting}
              className="w-full bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !phone.trim()}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verificando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Não tem acesso? O assistente de saúde funciona apenas por convite.
          </p>
        </div>
      </div>
    </div>
  );
}

// Tela de envio de código
function SendingCodeScreen({ phone }: { phone: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-rose-500/20 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <Heart className="h-10 w-10 text-rose-400 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-rose-500/30 animate-ping" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Enviando código...</h1>
        <p className="text-slate-400 text-sm mb-4">
          Estamos enviando um código de verificação para
        </p>
        <p className="text-white font-medium">{phone}</p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
        </div>
      </div>
    </div>
  );
}

// Constantes de tempo
const CODE_EXPIRATION_SECONDS = 600; // 10 minutos
const RESEND_COOLDOWN_SECONDS = 30; // 30 segundos

// Tela de Verificação
function VerifyScreen({
  phone,
  codeSentVia,
  codeSentError,
  resendingCode,
  onVerify,
  onResendCode,
  onBack,
  isSubmitting,
}: {
  phone: string;
  codeSentVia: CodeSentChannel;
  codeSentError: string | null;
  resendingCode: boolean;
  onVerify: (params: { code: string }) => Promise<{ success: boolean; error?: string }>;
  onResendCode: () => Promise<{ success: boolean; error?: string }>;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown para reenvio
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length === 6) {
      const result = await onVerify({ code });
      if (!result.success && result.error) {
        setError(result.error);
        setCode("");
      }
    }
  };

  const handleResend = async () => {
    setError(null);
    const result = await onResendCode();
    if (result.success) {
      sonnerToast.success("Código reenviado com sucesso!");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } else if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-rose-500/20">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verificar código</h1>
          <p className="text-slate-400 text-sm mb-1">
            Digite o código enviado para
          </p>
          <p className="text-white font-medium">{phone}</p>
        </div>

        <CodeSentFeedback channel={codeSentVia} error={codeSentError} />

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              value={code}
              onChange={setCode}
              maxLength={6}
              disabled={isSubmitting}
              render={({ slots }) => (
                <InputOTPGroup>
                  {slots.map((slot, index) => (
                    <InputOTPSlot
                      key={index}
                      {...slot}
                      index={index}
                      className="w-12 h-14 text-lg bg-slate-800/50 border-slate-700/50"
                    />
                  ))}
                </InputOTPGroup>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verificando...
              </>
            ) : (
              "Verificar código"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleResend}
            disabled={resendingCode || resendCooldown > 0}
            className="text-sm text-rose-400 hover:text-rose-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            {resendingCode ? (
              <>
                <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                Reenviando...
              </>
            ) : resendCooldown > 0 ? (
              `Aguarde ${resendCooldown}s para reenviar`
            ) : (
              <>
                <RefreshCw className="inline h-3 w-3 mr-1" />
                Reenviar código
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente principal
export function PWAHealthAuthGate({ children }: PWAHealthAuthGateProps) {
  // DEMO MODE: Bypass de autenticação
  const { isDemoMode, demoType } = useDemoMode();
  const { initializeDemo, demoUser } = useDemoStore();

  // Inicializar demo se detectado
  useEffect(() => {
    if (isDemoMode && demoType) {
      console.log("[PWAHealthAuthGate] Demo mode detectado:", demoType);
      initializeDemo(demoType);
    }
  }, [isDemoMode, demoType, initializeDemo]);

  // BYPASS: Se demo mode ativo, pular autenticação
  if (isDemoMode) {
    console.log("[PWAHealthAuthGate] Bypass de autenticação (demo mode)");

    // Renderizar children como se estivesse autenticado
    if (typeof children === "function") {
      return <>{children({
        userName: demoUser.name,
        userPhone: demoUser.phone,
        sessionId: demoUser.sessionId,
        logout: () => console.log("[Demo] Logout não disponível em demo mode")
      })}</>;
    }
    return <>{children}</>;
  }

  // Fluxo normal de autenticação
  const {
    status,
    userName,
    userPhone,
    sessionId,
    codeSentVia,
    codeSentError,
    resendingCode,
    isSubmitting,
    login,
    verify,
    resendCode,
    backToLogin,
    logout,
  } = usePWAHealthAuth();

  console.log("[PWAHealthAuthGate] Status:", status);

  // Loading
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Needs login
  if (status === "needs_login") {
    return (
      <LoginScreen
        onLogin={login}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Sending code
  if (status === "sending_code") {
    return <SendingCodeScreen phone={userPhone || ""} />;
  }

  // Needs verification
  if (status === "needs_verification") {
    return (
      <VerifyScreen
        phone={userPhone || ""}
        codeSentVia={codeSentVia}
        codeSentError={codeSentError}
        resendingCode={resendingCode}
        onVerify={verify}
        onResendCode={resendCode}
        onBack={backToLogin}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Blocked
  if (status === "blocked") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Bloqueado</h1>
          <p className="text-red-300 mb-6">
            Muitas tentativas falhadas. Por favor, solicite um novo código.
          </p>
          <Button onClick={backToLogin} variant="outline">
            Voltar para login
          </Button>
        </div>
      </div>
    );
  }

  // Error
  if (status === "error") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Erro</h1>
          <p className="text-red-300 mb-6">
            Ocorreu um erro inesperado. Por favor, tente novamente.
          </p>
          <Button onClick={backToLogin}>
            Voltar para login
          </Button>
        </div>
      </div>
    );
  }

  // Verified - renderizar children
  if (status === "verified") {
    if (typeof children === "function") {
      return <>{children({ userName, userPhone, sessionId, logout })}</>;
    }
    return <>{children}</>;
  }

  return null;
}

export default PWAHealthAuthGate;
