import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft, Zap, KeyRound, Loader2, Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";


const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validate email format in real-time
  useEffect(() => {
    if (resetEmail.length === 0) {
      setIsEmailValid(null);
      setEmailError(null);
      return;
    }
    
    const isValid = validateEmailFormat(resetEmail);
    setIsEmailValid(isValid);
    setEmailError(isValid ? null : "Formato de email inválido");
  }, [resetEmail]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check user role for redirect
      const { data: superadminData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "superadmin")
        .maybeSingle();

      if (superadminData) {
        toast({
          title: "Login realizado",
          description: "Bem-vindo, Super Admin!",
        });
        navigate("/hub");
        return;
      }

      const { data: adminData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (adminData) {
        toast({
          title: "Login realizado",
          description: "Bem-vindo ao Dashboard.",
        });
        navigate("/dashboard");
        return;
      }

      // Default user - redirect to app
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao KnowYOU App.",
      });
      navigate("/app");
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEmailValid) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }
    
    setIsResetting(true);

    try {
      // First check if the email exists in auth.users via Edge Function
      const response = await supabase.functions.invoke('send-recovery-code', {
        body: { email: resetEmail }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar código');
      }

      const data = response.data;

      if (data.error === 'email_not_found') {
        setEmailError("Email não registrado no sistema");
        toast({
          title: "Email não encontrado",
          description: "Este email não está registrado no sistema.",
          variant: "destructive",
        });
        return;
      }

      if (data.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // (audit logging handled server-side)

      toast({
        title: "Código enviado",
        description: "Verifique seu email para o código de recuperação",
      });

      // Navigate to reset page with email
      navigate(`/admin/reset-password?email=${encodeURIComponent(resetEmail)}`);

    } catch (err: any) {
      console.error("Error requesting recovery code:", err);
      // (audit logging handled server-side)
      toast({
        title: "Erro",
        description: err.message || "Erro ao solicitar código de recuperação",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
            {showForgotPassword ? (
              <KeyRound className="w-8 h-8 text-white" />
            ) : (
              <Lock className="w-8 h-8 text-white" />
            )}
          </div>

          {!showForgotPassword ? (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-muted-foreground mt-2">
                  Entre com suas credenciais
                </p>
              </div>

              <form onSubmit={handleLogin} className="w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu-email@exemplo.com"
                    className="bg-background/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="bg-background/50 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Esqueceu sua senha?
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Recuperar Senha</h1>
                <p className="text-muted-foreground mt-2">
                  Digite seu email para receber um código de recuperação
                </p>
              </div>

              <form onSubmit={handleRequestCode} className="w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="seu-email@exemplo.com"
                      className={`bg-background/50 pr-10 ${
                        isEmailValid === false ? 'border-red-500 focus:border-red-500' : 
                        isEmailValid === true ? 'border-green-500 focus:border-green-500' : ''
                      }`}
                      required
                    />
                    {resetEmail.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isEmailValid === true && <Check className="h-4 w-4 text-green-500" />}
                        {isEmailValid === false && <X className="h-4 w-4 text-red-500" />}
                      </div>
                    )}
                  </div>
                  {emailError && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {emailError}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={isResetting || !isEmailValid}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando código...
                    </>
                  ) : (
                    "Enviar Código"
                  )}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>
            </>
          )}

          {/* Botão retornar ao App */}
          <div className="w-full pt-0.5 border-t border-primary/10">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-white hover:bg-green-500 hover:text-black text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Retornar ao App
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;

