import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Contact() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Usuário logado - ir para área de mensagens do admin
        navigate("/admin", { state: { tab: "auditoria", subtab: "mensagens" } });
      } else {
        // Usuário não logado - ir para login
        navigate("/admin/login");
      }
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}
