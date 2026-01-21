// =============================================
// PWA Register Page v7.0 - SIMPLIFICADO
// Build: 2026-01-14
// Funções: login_pwa, verify_pwa_code
// Tabelas: pwa_invites, pwa_sessions
// src/pages/PWARegisterPage.tsx
// =============================================

import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, Phone, KeyRound, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type PageState = "loading" | "invalid" | "confirm" | "verify" | "success" | "error";

interface InvitationData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  invited_by?: string;
}

const PWA_BG_COLOR = "#0A0E1A";
const STORAGE_KEY = "pwa-verified-phone";

export default function PWARegisterPage() {
  const { token: tokenParam } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const code_param = searchParams.get("code");
  const token = tokenParam || searchParams.get("token") || undefined;
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Force PWA background colors
  useEffect(() => {
    document.body.style.backgroundColor = PWA_BG_COLOR;
    document.documentElement.style.backgroundColor = PWA_BG_COLOR;

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", PWA_BG_COLOR);
    }

    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  // Validate token/code on load
  useEffect(() => {
    const validateInvite = async () => {
      // Se tem código de convite (novo fluxo via pwa_invites)
      if (code_param) {
        try {
          const { data, error: queryError } = await supabase
            .from("pwa_invites")
            .select("id, name, phone, email, invited_by, status, expires_at")
            .eq("invite_code", code_param)
            .eq("status", "pending")
            .gt("expires_at", new Date().toISOString())
            .single();

          if (queryError || !data) {
            console.error("Invalid invite code:", queryError);
            setPageState("invalid");
            return;
          }

          setInvitation({
            id: data.id,
            name: data.name || "",
            phone: data.phone || "",
            email: data.email || undefined,
          });
          setPhone(data.phone || "");
          setPageState("confirm");
          return;
        } catch (err) {
          console.error("Error validating invite code:", err);
          setPageState("invalid");
          return;
        }
      }

      // Se tem token (fluxo antigo via user_invitations - manter compatibilidade)
      if (token) {
        try {
          const { data, error: queryError } = await supabase
            .from("pwa_invites")
            .select("id, name, phone, email")
            .eq("invite_code", token)
            .eq("status", "pending")
            .gt("expires_at", new Date().toISOString())
            .single();

          if (queryError || !data) {
            console.error("Invalid token:", queryError);
            setPageState("invalid");
            return;
          }

          setInvitation({
            id: data.id,
            name: data.name || "",
            phone: data.phone || "",
            email: data.email || undefined,
          });
          setPhone(data.phone || "");
          setPageState("confirm");
          return;
        } catch (err) {
          console.error("Error validating token:", err);
          setPageState("invalid");
          return;
        }
      }

      // Sem código nem token
      setPageState("invalid");
    };

    validateInvite();
  }, [token, code_param]);

  // Confirm data and send OTP
  const handleConfirm = async () => {
    if (!phone.trim()) {
      setError("Informe seu telefone");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Usar a nova função login_pwa
      const { data, error: rpcError } = await supabase.rpc("login_pwa", {
        p_phone: phone,
      });

      if (rpcError) {
        setError(rpcError.message);
        setIsSubmitting(false);
        return;
      }

      const result = data as {
        success: boolean;
        verification_code?: string;
        phone?: string;
        user_name?: string;
        error?: string;
        already_verified?: boolean;
      };

      // Se já está verificado, salvar e redirecionar
      if (result.already_verified) {
        const phoneToSave = result.phone || phone;
        localStorage.setItem(STORAGE_KEY, phoneToSave);
        setPageState("success");
        setTimeout(() => navigate("/pwa"), 2000);
        return;
      }

      if (!result.success) {
        if (result.error === "no_invitation") {
          setError("Você precisa de um convite para acessar o PWA.");
        } else {
          setError(result.error || "Erro ao processar");
        }
        setIsSubmitting(false);
        return;
      }

      // Enviar SMS com código diretamente
      if (result.verification_code) {
        const normalizedPhone = result.phone || phone;
        const smsMessage = `KnowYOU: Seu codigo de verificacao: ${result.verification_code}. Valido por 10 minutos.`;

        await supabase.functions.invoke("send-sms", {
          body: {
            phoneNumber: normalizedPhone,
            message: smsMessage,
            eventType: "pwa_otp",
          },
        });
      }

      setPageState("verify");
    } catch (err) {
      console.error("Error:", err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP code
  const handleVerify = async () => {
    if (code.length !== 6) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Usar a nova função verify_pwa_code
      const { data, error: rpcError } = await supabase.rpc("verify_pwa_code", {
        p_phone: phone,
        p_code: code,
      });

      if (rpcError) {
        setError(rpcError.message);
        setIsSubmitting(false);
        return;
      }

      const result = data as {
        success: boolean;
        error?: string;
        user_name?: string;
        expires_at?: string;
      };

      if (!result.success) {
        if (result.error === "invalid_code") {
          setError("Código inválido. Tente novamente.");
        } else if (result.error === "code_expired") {
          setError("Código expirado. Solicite um novo código.");
        } else if (result.error === "session_not_found") {
          setError("Sessão não encontrada. Faça login novamente.");
        } else {
          setError(result.error || "Código inválido");
        }
        setIsSubmitting(false);
        return;
      }

      // Success! Salvar telefone no localStorage
      localStorage.setItem(STORAGE_KEY, phone);
      setPageState("success");

      // Redirect to /pwa after 2 seconds
      setTimeout(() => {
        navigate("/pwa");
      }, 2000);
    } catch (err) {
      console.error("Error:", err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading
  if (pageState === "loading") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Validando convite...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token
  if (pageState === "invalid") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-xl max-w-sm w-full text-center border border-border">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Convite Inválido</h1>
            <p className="text-muted-foreground text-sm mb-6">Este link de convite é inválido ou expirou.</p>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (pageState === "success") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-xl max-w-sm w-full text-center border border-border">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Cadastro Concluído!</h1>
            <p className="text-muted-foreground text-sm mb-4">Bem-vindo ao KnowYOU, {invitation?.name || "Usuário"}!</p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Redirecionando...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirm data
  if (pageState === "confirm") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-xl max-w-sm w-full border border-border">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                {invitation?.name ? `Olá, ${invitation.name}!` : "Bem-vindo!"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Você foi convidado para o KnowYOU.</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Confirme seu telefone</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  disabled={isSubmitting}
                  className="h-12"
                />
              </div>
              <Button onClick={handleConfirm} disabled={isSubmitting || !phone.trim()} className="w-full h-12">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verify code
  if (pageState === "verify") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-xl max-w-sm w-full border border-border">
            <button
              onClick={() => setPageState("confirm")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Verificar Código</h1>
              <p className="text-muted-foreground text-sm mt-1">Digite o código enviado para {phone}</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex justify-center mb-6">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
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

            <Button onClick={handleVerify} disabled={isSubmitting || code.length !== 6} className="w-full h-12">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
