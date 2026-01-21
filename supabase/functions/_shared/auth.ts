// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

/**
 * Módulo centralizado de autenticação para Edge Functions
 * Valida tokens JWT e gerencia contexto de usuário
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unauthorizedResponse, forbiddenResponse } from "./response.ts";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface AuthResult {
  user: AuthenticatedUser;
  error?: never;
}

export interface AuthError {
  user?: never;
  error: Response;
}

/**
 * Valida autenticação e retorna usuário ou erro
 * @param req - Request object
 * @returns AuthResult com user ou error Response
 */
export async function requireAuth(req: Request): Promise<AuthResult | AuthError> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader) {
    return { error: unauthorizedResponse("Header de autorização ausente") };
  }
  
  if (!authHeader.startsWith("Bearer ")) {
    return { error: unauthorizedResponse("Formato de autorização inválido. Use: Bearer <token>") };
  }

  const token = authHeader.replace("Bearer ", "");
  
  if (!token || token.length < 10) {
    return { error: unauthorizedResponse("Token inválido") };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[AUTH] Missing Supabase environment variables");
    return { error: unauthorizedResponse("Erro de configuração do servidor") };
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error("[AUTH] Token validation failed:", error.message);
    return { error: unauthorizedResponse("Token inválido ou expirado") };
  }
  
  if (!user) {
    return { error: unauthorizedResponse("Usuário não encontrado") };
  }

  return { 
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    }
  };
}

/**
 * Tenta autenticar mas não falha se não houver token
 * Útil para endpoints públicos com funcionalidade extra para autenticados
 * @param req - Request object
 * @returns User ou null
 */
export async function optionalAuth(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const result = await requireAuth(req);
  
  if ("error" in result) {
    return null;
  }
  
  return result.user;
}

/**
 * Valida se o usuário tem um papel específico
 * @param user - Usuário autenticado
 * @param allowedRoles - Lista de papéis permitidos
 * @returns Response de erro ou null se autorizado
 */
export function requireRole(
  user: AuthenticatedUser, 
  allowedRoles: string[]
): Response | null {
  const userRole = user.app_metadata?.role as string || user.role || "user";
  
  if (!allowedRoles.includes(userRole)) {
    return forbiddenResponse(
      `Acesso negado. Papel necessário: ${allowedRoles.join(" ou ")}`
    );
  }
  
  return null;
}

/**
 * Valida se o usuário é admin
 * @param user - Usuário autenticado
 * @returns Response de erro ou null se autorizado
 */
export function requireAdmin(user: AuthenticatedUser): Response | null {
  return requireRole(user, ["admin", "superadmin"]);
}

/**
 * Extrai o token Bearer do header de autorização
 * @param req - Request object
 * @returns Token ou null
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  return authHeader.replace("Bearer ", "");
}
