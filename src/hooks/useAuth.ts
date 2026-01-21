import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export type UserRole = "user" | "admin" | "superadmin" | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isLoading: boolean;
}

export function useAuth() {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
  });

  // Fetch user role from user_roles table
  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    try {
      // Check for superadmin first
      const { data: superadminData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "superadmin")
        .maybeSingle();

      if (superadminData) return "superadmin";

      // Check for admin
      const { data: adminData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (adminData) return "admin";

      // Default to user
      return "user";
    } catch (error) {
      console.error("Error fetching user role:", error);
      return "user";
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState(prev => ({ ...prev, session, user: session?.user ?? null }));

        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(async () => {
            const role = await fetchUserRole(session.user.id);
            setState(prev => ({ ...prev, role, isLoading: false }));
          }, 0);
        } else {
          setState(prev => ({ ...prev, role: null, isLoading: false }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setState(prev => ({ ...prev, session, user: session?.user ?? null }));

      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setState(prev => ({ ...prev, role, isLoading: false }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("admin_authenticated");
    navigate("/admin/login");
  }, [navigate]);

  // Role hierarchy check
  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    if (!state.role || !requiredRole) return false;
    
    const roleHierarchy: Record<string, number> = {
      user: 1,
      admin: 2,
      superadmin: 3,
    };

    const userLevel = roleHierarchy[state.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }, [state.role]);

  return {
    user: state.user,
    session: state.session,
    role: state.role,
    isLoading: state.isLoading,
    signOut,
    hasRole,
  };
}
