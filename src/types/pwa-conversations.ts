// PWA Conversations Types - v1.0.0

export type PWAModuleType = 'world' | 'health' | 'ideas';
export type MessageRole = 'user' | 'assistant';
export type CompanySource = 'dns' | 'user_input' | 'undefined';
export type SortDirection = 'asc' | 'desc';

export interface PWAUser {
  device_id: string;
  user_name: string | null;
  user_email: string | null;
  company: string | null;
  company_source: CompanySource;
  last_activity: string;
  total_sessions: number;
  modules_used: PWAModuleType[];
}

export interface PWAConversationSession {
  id: string;
  device_id: string;
  user_name: string | null;
  user_email: string | null;
  company: string | null;
  company_source: CompanySource;
  module_type: PWAModuleType;
  started_at: string;
  ended_at: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  messages?: PWAConversationMessage[];
  summary?: PWAConversationSummary;
}

export interface PWAConversationMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  audio_url: string | null;
  audio_duration: number | null;
  transcription: string | null;
  timestamp: string;
  taxonomy_tags: string[];
  key_topics: KeyTopics | null;
  created_at: string;
}

/**
 * PWA Conversation Summary
 * @table pwa_conv_summaries - Nome da tabela no banco de dados
 */
export interface PWAConversationSummary {
  id: string;
  session_id: string;
  summary_text: string;
  summary_audio_url: string | null;
  taxonomy_tags: string[];
  key_topics: KeyTopics | null;
  generated_at: string;
}

export interface KeyTopics {
  people: string[];
  countries: string[];
  organizations: string[];
}

export interface PWAUsersFilters {
  search?: string;
  company?: string;
  dateFrom?: string;
  dateTo?: string;
  taxonomyTags?: string[];
  keyTopics?: string[];
  modules?: PWAModuleType[];
}

export interface PWAUsersSortConfig {
  column: 'user_name' | 'company' | 'last_activity';
  direction: SortDirection;
}

export interface PWASummaryFilters {
  date?: string;
  taxonomyTags?: string[];
  keyTopics?: string[];
}

export interface AutocompleteItem {
  value: string;
  label: string;
  count?: number;
  category?: 'taxonomy' | 'person' | 'country' | 'organization';
}

export interface PWAConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  moduleType: PWAModuleType;
  userName?: string;
}

export interface PWAModuleConfig {
  type: PWAModuleType;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const PWA_MODULES: PWAModuleConfig[] = [
  { type: 'world', name: 'Mundo', icon: 'Globe', color: '#10B981', bgColor: 'bg-emerald-500/20' },
  { type: 'health', name: 'Saúde', icon: 'Heart', color: '#EF4444', bgColor: 'bg-red-500/20' },
  { type: 'ideas', name: 'Ideias', icon: 'Lightbulb', color: '#F59E0B', bgColor: 'bg-amber-500/20' },
];

export const GENERIC_EMAIL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
  'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'mail.com',
];

export function extractCompanyFromEmail(email: string | null): { company: string; source: CompanySource } {
  if (!email) return { company: 'Não definida', source: 'undefined' };
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || GENERIC_EMAIL_DOMAINS.includes(domain)) {
    return { company: 'Não definida', source: 'undefined' };
  }
  const companyName = domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { company: companyName, source: 'dns' };
}
