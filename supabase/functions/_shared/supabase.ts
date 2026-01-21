// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

/**
 * Módulo centralizado de cliente Supabase para Edge Functions
 * Gerencia criação de clientes com diferentes níveis de permissão
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cache de clientes para evitar recriação desnecessária
let adminClient: SupabaseClient | null = null;

/**
 * Obtém o cliente Supabase com permissões de admin (service role)
 * Use apenas para operações que precisam bypassar RLS
 * @returns Cliente Supabase com service role key
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
    }
    
    adminClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

/**
 * Cria um cliente Supabase com token do usuário
 * Respeita RLS policies
 * @param authHeader - Header de autorização da requisição
 * @returns Cliente Supabase autenticado como o usuário
 */
export function getSupabaseWithAuth(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Obtém a URL do Supabase
 * @returns URL do projeto Supabase
 */
export function getSupabaseUrl(): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }
  return url;
}

/**
 * Obtém a anon key do Supabase
 * @returns Anon key do projeto
 */
export function getSupabaseAnonKey(): string {
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!key) {
    throw new Error("Missing SUPABASE_ANON_KEY environment variable");
  }
  return key;
}

/**
 * Obtém o Project ID do Supabase a partir da URL
 * @returns Project ID
 */
export function getSupabaseProjectId(): string {
  const url = getSupabaseUrl();
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    throw new Error("Could not extract project ID from SUPABASE_URL");
  }
  return match[1];
}
