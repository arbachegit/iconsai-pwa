/**
 * Date formatting utilities for economic indicators
 * Formats dates based on frequency (daily, monthly, quarterly, yearly)
 */

export type Frequency = 'daily' | 'monthly' | 'quarterly' | 'yearly' | 'annual' | string | null;

/**
 * Formats a date based on the indicator's frequency
 * @param date - Date string or Date object
 * @param frequency - The data frequency
 * @returns Formatted date string
 */
export function formatDateByFrequency(
  date: string | Date,
  frequency: Frequency
): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return String(date);
  }
  
  const freq = (frequency || '').toLowerCase();
  
  switch (freq) {
    case 'yearly':
    case 'annual':
      // Just the year: 2025
      return d.getFullYear().toString();
      
    case 'quarterly':
      // Format: 1º tri 2025
      const quarter = Math.ceil((d.getMonth() + 1) / 3);
      return `${quarter}º tri ${d.getFullYear()}`;
      
    case 'monthly':
      // Format: 1/2025, 2/2025, etc.
      return `${d.getMonth() + 1}/${d.getFullYear()}`;
      
    case 'daily':
      // Format: 14/12/2025
      return d.toLocaleDateString('pt-BR');
      
    default:
      // Default: MM/YYYY
      return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

/**
 * Formats a date for chart X-axis display
 * @param date - Date string or Date object
 * @param frequency - The data frequency
 * @returns Formatted date string for axis
 */
export function formatAxisDate(
  date: string | Date,
  frequency: Frequency
): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return String(date);
  }
  
  const freq = (frequency || '').toLowerCase();
  
  switch (freq) {
    case 'yearly':
    case 'annual':
      return d.getFullYear().toString();
      
    case 'quarterly':
      const quarter = Math.ceil((d.getMonth() + 1) / 3);
      return `${quarter}ºT/${d.getFullYear().toString().slice(-2)}`;
      
    case 'monthly':
      return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
      
    case 'daily':
      return `${d.getDate()}/${d.getMonth() + 1}`;
      
    default:
      return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
  }
}

/**
 * Get the next period label based on the last date and frequency
 * @param lastDate - The last date in the series
 * @param frequency - The data frequency
 * @returns Label for the next period
 */
export function getNextPeriodLabel(lastDate: Date | string, frequency: Frequency): string {
  const d = new Date(lastDate);
  const freq = (frequency || '').toLowerCase();
  
  switch (freq) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('pt-BR');
      
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${months[d.getMonth()]}/${d.getFullYear()}`;
      
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      const quarter = Math.ceil((d.getMonth() + 1) / 3);
      return `${quarter}º tri ${d.getFullYear()}`;
      
    case 'yearly':
    case 'annual':
      d.setFullYear(d.getFullYear() + 1);
      return d.getFullYear().toString();
      
    default:
      d.setMonth(d.getMonth() + 1);
      return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

/**
 * Detect frequency from data characteristics
 * @param count - Number of records
 * @param startDate - First date
 * @param endDate - Last date
 * @returns Estimated frequency
 */
export function detectFrequencyFromData(
  count: number,
  startDate: string | Date,
  endDate: string | Date
): Frequency {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const avgPerMonth = count / Math.max(monthsDiff, 1);
  
  if (avgPerMonth > 20) return 'daily';
  if (avgPerMonth > 3) return 'monthly';
  if (avgPerMonth > 0.3) return 'quarterly';
  return 'yearly';
}
