import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/admin/login");
          return;
        }

        setUserEmail(user.email || null);

        // Check if user has admin or superadmin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "superadmin"])
          .maybeSingle();

        if (!roleData) {
          // Redirect regular users to /app
          navigate("/app");
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold text-foreground">Dashboard</span>
        </div>
        <span className="text-sm text-muted-foreground">{userEmail}</span>
      </header>

      {/* Content */}
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <LayoutDashboard className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Esta página está pronta para receber novos recursos.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
