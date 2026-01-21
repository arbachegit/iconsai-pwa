// =============================================
// PWA Auth Gate v4.2 - Com VoiceSpectrum + Demo Mode
// Build: 2026-01-17T14:00:00Z
// Telefone como identificador + VoiceSpectrum + Demo Bypass
// =============================================

import { ReactNode, useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Shield, Phone, KeyRound, ArrowLeft, MessageCircle, MessageSquare, AlertTriangle, CheckCircle2, Clock, Timer } from "lucide-react";
import { usePWAAuth, CodeSentChannel } from "@/hooks/usePWAAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useDemoStore } from "@/stores/demoStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { VoiceSpectrum } from "@/components/pwa/VoiceSpectrum";

interface PWAAuthGateProps {
  children: ReactNode | ((data: { userPhone: string; pwaAccess: string[] }) => ReactNode);
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
      <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 p-3 rounded-lg mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (channel === 'whatsapp') {
    return (
      <div className="flex items-center gap-2 bg-green-500/10 text-green-500 p-3 rounded-lg mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <MessageCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">Código enviado via WhatsApp</span>
        <CheckCircle2 className="h-4 w-4 ml-auto" />
      </div>
    );
  }

  if (channel === 'sms') {
    return (
      <div className="flex items-center gap-2 bg-blue-500/10 text-blue-500 p-3 rounded-lg mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <MessageSquare className="h-5 w-5 flex-shrink-0" />
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
  previousPhone,
}: {
  onLogin: (params: { phone: string }) => Promise<{ success: boolean; error?: string }>;
  isSubmitting: boolean;
  previousPhone?: string | null;
}) {
  const [phone, setPhone] = useState(previousPhone || "");
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Entrar no KnowYOU</h1>
          <p className="text-muted-foreground text-sm">
            Digite seu telefone para acessar
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={isSubmitting}
              className="w-full"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !phone.trim()}
            className="w-full"
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
          <p className="text-xs text-muted-foreground">
            Não tem acesso? O KnowYOU funciona apenas por convite.
          </p>
        </div>
      </div>
    </div>
  );
}

// Tela de envio de código (transição)
function SendingCodeScreen({ phone }: { phone: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <MessageSquare className="h-10 w-10 text-primary animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Enviando código...</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Estamos enviando um código de verificação para
        </p>
        <p className="text-foreground font-medium">{phone}</p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}

// Constantes de tempo
const CODE_EXPIRATION_SECONDS = 600; // 10 minutos
const RESEND_COOLDOWN_SECONDS = 30; // 30 segundos para reenviar

// Tela de Verificação de Código com Cronômetro
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
  onResendCode: () => Promise<{ success: boolean; code?: string; channel?: CodeSentChannel; error?: string }>;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Cronômetro de expiração
  const [timeLeft, setTimeLeft] = useState(CODE_EXPIRATION_SECONDS);
  const [isExpired, setIsExpired] = useState(false);
  
  // Cooldown para reenvio
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer de expiração do código
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Timer de cooldown para reenvio
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Formatar tempo (mm:ss)
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cor do cronômetro baseada no tempo restante
  const getTimerColor = useCallback(() => {
    if (timeLeft <= 0) return 'text-destructive';
    if (timeLeft <= 60) return 'text-red-500'; // Menos de 1 minuto
    if (timeLeft <= 120) return 'text-yellow-500'; // 1-2 minutos
    return 'text-green-500'; // Mais de 2 minutos
  }, [timeLeft]);

  const getTimerBgColor = useCallback(() => {
    if (timeLeft <= 0) return 'bg-destructive/10 border-destructive/30';
    if (timeLeft <= 60) return 'bg-red-500/10 border-red-500/30';
    if (timeLeft <= 120) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-green-500/10 border-green-500/30';
  }, [timeLeft]);

  const handleVerify = async () => {
    if (code.length === 6 && !isExpired) {
      setError(null);
      const result = await onVerify({ code });
      if (!result.success && result.error) {
        setError(result.error);
      }
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setError(null);
    const result = await onResendCode();
    if (result.success && result.channel) {
      // Resetar cronômetro e iniciar cooldown
      setTimeLeft(CODE_EXPIRATION_SECONDS);
      setIsExpired(false);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setCode("");
      
      toast({
        title: "Código reenviado!",
        description: `Enviamos um novo código via ${result.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`,
      });
    } else if (result.error) {
      toast({
        variant: "destructive",
        title: "Erro ao reenviar",
        description: result.error,
      });
    }
  };

  // Mascarar número de telefone para exibição
  const maskedPhone = phone.length > 4 
    ? `***${phone.slice(-4)}` 
    : phone;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Verificar Telefone</h1>
          
          {/* Instrução clara sobre SMS */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <span>Enviamos um código de <strong>6 dígitos</strong> via SMS</span>
          </div>
          <p className="text-foreground font-medium text-sm">
            para o número terminado em {maskedPhone}
          </p>
        </div>

        {/* Cronômetro de expiração */}
        <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border mb-4 ${getTimerBgColor()}`}>
          {isExpired ? (
            <>
              <Timer className="h-5 w-5 text-destructive" />
              <span className="text-destructive font-medium">Código expirado</span>
            </>
          ) : (
            <>
              <Clock className={`h-5 w-5 ${getTimerColor()}`} />
              <span className={`font-medium ${getTimerColor()}`}>
                Tempo restante: {formatTime(timeLeft)}
              </span>
            </>
          )}
        </div>

        {/* Regra de expiração */}
        <p className="text-xs text-muted-foreground text-center mb-4">
          O código expira em <strong>10 minutos</strong> após o envio
        </p>

        {/* Feedback de envio de código */}
        <CodeSentFeedback channel={codeSentVia} error={codeSentError} />

        {/* Erro de verificação */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Aviso quando expirado */}
        {isExpired && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-medium">
                Seu código expirou. Clique em "Reenviar código" para receber um novo.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={isSubmitting || isExpired}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={handleVerify}
          disabled={isSubmitting || code.length !== 6 || isExpired}
          className="w-full mb-4"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verificando...
            </>
          ) : isExpired ? (
            "Código expirado"
          ) : (
            "Verificar"
          )}
        </Button>

        {/* Botão de reenvio com cooldown */}
        <div className="text-center">
          {resendCooldown > 0 ? (
            <p className="text-sm text-muted-foreground">
              Aguarde <span className="font-medium text-foreground">{resendCooldown}s</span> para reenviar
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={isSubmitting || resendingCode}
              className={`text-sm hover:underline disabled:opacity-50 flex items-center justify-center gap-2 mx-auto ${
                isExpired ? 'text-yellow-500 font-medium' : 'text-primary'
              }`}
            >
              {resendingCode ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  {isExpired ? 'Reenviar código agora' : 'Não recebeu? Reenviar código'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Regra de reenvio */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Não recebeu? Aguarde <strong>30 segundos</strong> entre cada reenvio
        </p>
      </div>
    </div>
  );
}

// Tela de Bloqueio
function BlockedScreen({
  reason,
}: {
  reason: string | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-destructive/30 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Bloqueado</h1>
        <p className="text-muted-foreground mb-4">
          {reason || "Este dispositivo foi bloqueado por motivos de segurança."}
        </p>
      </div>
    </div>
  );
}

export function PWAAuthGate({ children }: PWAAuthGateProps) {
  // DEMO MODE: Bypass de autenticação
  const { isDemoMode, demoType } = useDemoMode();
  const { initializeDemo, demoUser } = useDemoStore();

  // Inicializar demo se detectado
  useEffect(() => {
    if (isDemoMode && demoType) {
      console.log("[PWAAuthGate] Demo mode detectado:", demoType);
      initializeDemo(demoType);
    }
  }, [isDemoMode, demoType, initializeDemo]);

  // BYPASS: Se demo mode ativo, pular autenticação
  if (isDemoMode) {
    console.log("[PWAAuthGate] Bypass de autenticação (demo mode)");

    // Renderizar children como se estivesse autenticado
    if (typeof children === "function") {
      return <>{children({
        userPhone: demoUser.phone,
        pwaAccess: ["all"] // Acesso completo em demo
      })}</>;
    }
    return <>{children}</>;
  }

  // Fluxo normal de autenticação
  const {
    status,
    userPhone,
    pwaAccess,
    blockReason,
    codeSentVia,
    codeSentError,
    resendingCode,
    errorMessage,
    isSubmitting,
    login,
    verify,
    resendCode,
    backToLogin,
    refresh,
  } = usePWAAuth();

  // Debug logging v4.2
  useEffect(() => {
    console.log('[PWAAuthGate v4.2] Status:', status, '| Phone:', userPhone?.substring(0, 8) + '...');
  }, [status, userPhone]);

  // Loading state - Agora com VoiceSpectrum animado
  if (status === "loading") {
    return <VoiceSpectrum isActive={true} message="Verificando acesso..." />;
  }

  // Blocked state
  if (status === "blocked") {
    return <BlockedScreen reason={blockReason} />;
  }

  // Sending code state (transição) - Com VoiceSpectrum
  if (status === "sending_code") {
    return <VoiceSpectrum isActive={true} message="Enviando código de verificação..." />;
  }

  // Login state
  if (status === "needs_login") {
    return (
      <LoginScreen
        onLogin={login}
        isSubmitting={isSubmitting}
        previousPhone={userPhone}
      />
    );
  }

  // Verification state
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

  // Error state
  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Erro de Conexão</h1>
          <p className="text-muted-foreground mb-6">
            {errorMessage || "Não foi possível verificar seu acesso. Verifique sua conexão e tente novamente."}
          </p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Verified state - render children
  if (status === "verified" && userPhone) {
    const accessList = pwaAccess || [];
    
    if (typeof children === "function") {
      return <>{children({ userPhone, pwaAccess: accessList })}</>;
    }
    
    return <>{children}</>;
  }

  // Fallback loading
  return <VoiceSpectrum isActive={true} message="Carregando..." />;
}

export default PWAAuthGate;
