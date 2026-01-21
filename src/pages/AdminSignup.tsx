import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Check, X, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Password validation requirements matching AdminResetPassword.tsx
const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
};

const getPasswordStrength = (password: string): { strength: string; color: string } => {
  const validation = validatePassword(password);
  const score = Object.values(validation).filter(Boolean).length;
  
  if (score <= 2) return { strength: "Fraca", color: "text-red-500" };
  if (score <= 3) return { strength: "Média", color: "text-yellow-500" };
  if (score <= 4) return { strength: "Forte", color: "text-blue-500" };
  return { strength: "Muito Forte", color: "text-green-500" };
};

const AdminSignup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAdmins, setIsCheckingAdmins] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Security: Check if admin users already exist - hide signup if they do
  useEffect(() => {
    const checkExistingAdmins = async () => {
      try {
        // Check if any admin roles exist in the system
        const { count, error } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .in('role', ['admin', 'superadmin']);
        
        if (error) {
          console.error('Error checking admin existence:', error);
          // If we can't check, allow access but log the issue
          setAdminExists(false);
        } else {
          setAdminExists((count ?? 0) > 0);
        }
      } catch (err) {
        console.error('Failed to check admin existence:', err);
        setAdminExists(false);
      } finally {
        setIsCheckingAdmins(false);
      }
    };

    checkExistingAdmins();
  }, []);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique suas senhas.",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordValid) {
      toast({
        title: "Senha não atende aos requisitos",
        description: "A senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Conta criada!",
          description: `Usuário criado com sucesso. ID: ${data.user.id}`,
        });

        // Show instructions for adding admin role
        toast({
          title: "Próximo passo",
          description: "Abra o Backend e execute o SQL para adicionar a role de admin.",
          duration: 10000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking
  if (isCheckingAdmins) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Security: Block signup if admins already exist
  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
              <p className="text-muted-foreground mt-2">
                O cadastro de novos administradores está desabilitado.
              </p>
              <p className="text-muted-foreground text-sm mt-4">
                Já existem administradores no sistema. Novos admins devem ser 
                criados por um administrador existente através do painel de controle.
              </p>
            </div>

            <Button
              onClick={() => navigate("/admin/login")}
              className="w-full bg-gradient-primary"
            >
              Ir para Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-white" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Criar Admin</h1>
            <p className="text-muted-foreground mt-2">
              Cadastre o primeiro administrador
            </p>
          </div>

          <form onSubmit={handleSignup} className="w-full space-y-4">
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
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres com complexidade"
                className="bg-background/50"
                required
                minLength={8}
              />
              {password && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Força:</span>
                    <span className={`text-sm font-medium ${passwordStrength.color}`}>
                      {passwordStrength.strength}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      {passwordValidation.minLength ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      <span className={passwordValidation.minLength ? "text-green-500" : "text-muted-foreground"}>
                        8+ caracteres
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {passwordValidation.hasUppercase ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      <span className={passwordValidation.hasUppercase ? "text-green-500" : "text-muted-foreground"}>
                        Maiúscula
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {passwordValidation.hasLowercase ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      <span className={passwordValidation.hasLowercase ? "text-green-500" : "text-muted-foreground"}>
                        Minúscula
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {passwordValidation.hasNumber ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      <span className={passwordValidation.hasNumber ? "text-green-500" : "text-muted-foreground"}>
                        Número
                      </span>
                    </div>
                    <div className="flex items-center gap-1 col-span-2">
                      {passwordValidation.hasSpecial ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      <span className={passwordValidation.hasSpecial ? "text-green-500" : "text-muted-foreground"}>
                        Caractere especial (!@#$%^&*)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Confirmar Senha
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                className="bg-background/50"
                required
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary"
              disabled={isLoading}
            >
              {isLoading ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>

          <div className="w-full pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-3">
              Após criar a conta, execute este SQL no Backend:
            </p>
            <code className="block p-3 bg-background/50 rounded text-xs text-foreground break-all">
              INSERT INTO public.user_roles (user_id, role)
              <br />
              VALUES ('SEU_USER_ID_AQUI', 'admin');
            </code>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate("/admin/login")}
            className="text-sm"
          >
            Já tem conta? Fazer login
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminSignup;
