// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

/**
 * Módulo centralizado de CORS para Edge Functions
 * Elimina duplicação de headers CORS em todas as funções
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

/**
 * Handler para requisições preflight (OPTIONS)
 * @param req - Request object
 * @returns Response para OPTIONS ou null para continuar processamento
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }
  return null;
}

/**
 * Verifica se o método HTTP é permitido
 * @param req - Request object
 * @param allowedMethods - Lista de métodos permitidos
 * @returns true se o método é permitido
 */
export function isMethodAllowed(req: Request, allowedMethods: string[]): boolean {
  return allowedMethods.includes(req.method);
}
