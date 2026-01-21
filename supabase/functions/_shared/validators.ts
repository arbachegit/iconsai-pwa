// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

/**
 * Módulo centralizado de validadores para Edge Functions
 * Funções de validação reutilizáveis para inputs comuns
 */

/**
 * Valida formato de email
 * @param email - Email a validar
 * @returns true se o formato é válido
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida formato de UUID v4
 * @param uuid - UUID a validar
 * @returns true se o formato é válido
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida formato de telefone (10-15 dígitos)
 * @param phone - Telefone a validar
 * @returns true se o formato é válido
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Valida formato de telefone brasileiro
 * @param phone - Telefone a validar
 * @returns true se o formato é válido
 */
export function isValidBrazilianPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/\D/g, "");
  // DDD (2 dígitos) + número (8-9 dígitos) = 10-11 dígitos
  // Com código do país (55) = 12-13 dígitos
  return (cleaned.length >= 10 && cleaned.length <= 13);
}

/**
 * Sanitiza string removendo espaços extras e limitando tamanho
 * @param str - String a sanitizar
 * @param maxLength - Tamanho máximo (default: 1000)
 * @returns String sanitizada
 */
export function sanitizeString(str: string, maxLength = 1000): string {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

/**
 * Sanitiza string para uso em consultas (previne SQL injection básico)
 * @param str - String a sanitizar
 * @returns String segura
 */
export function sanitizeForQuery(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str.replace(/['";\-\-]/g, "").trim();
}

/**
 * Valida campos obrigatórios em um objeto
 * @param data - Objeto com dados
 * @param fields - Lista de campos obrigatórios
 * @returns Resultado da validação
 */
export function requireFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): { valid: true } | { valid: false; missing: string[] } {
  const missing = fields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === "";
  });
  
  if (missing.length === 0) {
    return { valid: true };
  }
  
  return { valid: false, missing: missing as string[] };
}

/**
 * Valida tamanho de string
 * @param str - String a validar
 * @param min - Tamanho mínimo
 * @param max - Tamanho máximo
 * @returns true se o tamanho está dentro do range
 */
export function isValidLength(str: string, min: number, max: number): boolean {
  if (!str || typeof str !== "string") return min === 0;
  const length = str.trim().length;
  return length >= min && length <= max;
}

/**
 * Valida se é um número válido
 * @param value - Valor a validar
 * @returns true se é um número válido
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

/**
 * Valida se é um número positivo
 * @param value - Valor a validar
 * @returns true se é um número positivo
 */
export function isPositiveNumber(value: unknown): boolean {
  return isValidNumber(value) && value > 0;
}

/**
 * Valida formato de data ISO
 * @param dateStr - String de data
 * @returns true se é uma data ISO válida
 */
export function isValidISODate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== "string") return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr.includes("-");
}

/**
 * Valida formato de URL
 * @param url - URL a validar
 * @returns true se é uma URL válida
 */
export function isValidURL(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida formato de slug (lowercase, hyphens, no spaces)
 * @param slug - Slug a validar
 * @returns true se é um slug válido
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== "string") return false;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Valida formato de CPF brasileiro
 * @param cpf - CPF a validar
 * @returns true se o formato é válido (não valida dígitos verificadores)
 */
export function isValidCPFFormat(cpf: string): boolean {
  if (!cpf || typeof cpf !== "string") return false;
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.length === 11;
}

/**
 * Valida formato de CNPJ brasileiro
 * @param cnpj - CNPJ a validar
 * @returns true se o formato é válido (não valida dígitos verificadores)
 */
export function isValidCNPJFormat(cnpj: string): boolean {
  if (!cnpj || typeof cnpj !== "string") return false;
  const cleaned = cnpj.replace(/\D/g, "");
  return cleaned.length === 14;
}

/**
 * Valida formato de CEP brasileiro
 * @param cep - CEP a validar
 * @returns true se o formato é válido
 */
export function isValidCEP(cep: string): boolean {
  if (!cep || typeof cep !== "string") return false;
  const cleaned = cep.replace(/\D/g, "");
  return cleaned.length === 8;
}

/**
 * Valida se o valor está em uma lista de valores permitidos
 * @param value - Valor a validar
 * @param allowedValues - Lista de valores permitidos
 * @returns true se o valor está na lista
 */
export function isOneOf<T>(value: T, allowedValues: T[]): boolean {
  return allowedValues.includes(value);
}
