import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, isLoading, hasRole } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    // Redirect based on user's actual role
    if (role === "admin") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
