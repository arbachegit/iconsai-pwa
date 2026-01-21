/**
 * Centralized date formatting utilities
 * Consistent date handling across the application
 */

import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Format date and time in Brazilian format
 * @example "10/12/2025 14:30"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return '-';
  }
}

/**
 * Format date only in Brazilian format
 * @example "10/12/2025"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

/**
 * Format date with "às" separator for Brazilian Portuguese
 * @example "10/12/2025 às 14:30"
 */
export function formatDateTimeAt(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '-';
  }
}

/**
 * Format as relative time from now
 * @example "há 2 horas"
 */
export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  } catch {
    return '-';
  }
}

/**
 * Format for ISO string (useful for sorting)
 */
export function toISOString(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return new Date(date).toISOString();
  } catch {
    return '';
  }
}
