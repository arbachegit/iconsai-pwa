// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

/**
 * Módulo centralizado de respostas HTTP para Edge Functions
 * Padroniza formato de respostas JSON e tratamento de erros
 */

import { corsHeaders } from "./cors.ts";

/**
 * Cria uma resposta JSON padronizada
 * @param data - Dados a serem retornados
 * @param status - Código HTTP (default: 200)
 * @returns Response com JSON e headers corretos
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      ...corsHeaders, 
      "Content-Type": "application/json" 
    },
  });
}

/**
 * Cria uma resposta de erro padronizada
 * @param message - Mensagem de erro
 * @param status - Código HTTP (default: 500)
 * @param details - Detalhes adicionais do erro (opcional)
 * @returns Response de erro formatada
 */
export function errorResponse(
  message: string, 
  status = 500, 
  details?: Record<string, unknown>
): Response {
  const errorPayload: Record<string, unknown> = { 
    error: message,
    success: false,
    timestamp: new Date().toISOString(),
  };
  
  if (details) {
    errorPayload.details = details;
  }
  
  return jsonResponse(errorPayload, status);
}

/**
 * Cria uma resposta de sucesso padronizada
 * @param data - Dados a serem retornados
 * @param message - Mensagem de sucesso (opcional)
 * @returns Response de sucesso formatada
 */
export function successResponse<T>(
  data: T, 
  message?: string
): Response {
  return jsonResponse({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Cria uma resposta de "não encontrado"
 * @param resource - Nome do recurso não encontrado
 * @returns Response 404
 */
export function notFoundResponse(resource: string): Response {
  return errorResponse(`${resource} não encontrado`, 404);
}

/**
 * Cria uma resposta de "não autorizado"
 * @param message - Mensagem de erro (opcional)
 * @returns Response 401
 */
export function unauthorizedResponse(message = "Não autorizado"): Response {
  return errorResponse(message, 401);
}

/**
 * Cria uma resposta de "proibido"
 * @param message - Mensagem de erro (opcional)
 * @returns Response 403
 */
export function forbiddenResponse(message = "Acesso negado"): Response {
  return errorResponse(message, 403);
}

/**
 * Cria uma resposta de "requisição inválida"
 * @param message - Mensagem de erro
 * @param details - Detalhes de validação (opcional)
 * @returns Response 400
 */
export function badRequestResponse(
  message: string, 
  details?: Record<string, unknown>
): Response {
  return errorResponse(message, 400, details);
}

/**
 * Cria uma resposta de "rate limit excedido"
 * @param retryAfter - Segundos até nova tentativa (opcional)
 * @returns Response 429
 */
export function rateLimitResponse(retryAfter?: number): Response {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  
  if (retryAfter) {
    (headers as Record<string, string>)["Retry-After"] = String(retryAfter);
  }
  
  return new Response(
    JSON.stringify({ 
      error: "Rate limit excedido. Tente novamente mais tarde.",
      success: false,
      retryAfter,
    }),
    { status: 429, headers }
  );
}
