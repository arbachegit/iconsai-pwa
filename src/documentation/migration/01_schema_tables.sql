-- ============================================================
-- KNOWRISK - SCRIPT DE MIGRAÇÃO COMPLETO
-- Parte 1: Criação de Tabelas
-- Gerado em: 2026-01-13
-- ============================================================
-- IMPORTANTE: Execute este script ANTES de importar os dados
-- Ordem de execução: 01 -> 02 -> 03 -> 04
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TIPOS CUSTOMIZADOS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('superadmin', 'admin', 'editor', 'viewer', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABELAS BASE (sem dependências)
-- ============================================================

-- Estados brasileiros
CREATE TABLE IF NOT EXISTS public.estados (
  codigo_uf INTEGER PRIMARY KEY,
  uf VARCHAR(2) NOT NULL,
  nome TEXT NOT NULL,
  regiao TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC
);

-- UFs brasileiras detalhada
CREATE TABLE IF NOT EXISTS public.brazilian_ufs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf_code INTEGER UNIQUE NOT NULL,
  uf_sigla VARCHAR(2) NOT NULL,
  uf_name TEXT NOT NULL,
  region_code VARCHAR(2) NOT NULL,
  region_name TEXT NOT NULL,
  capital TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Municípios
CREATE TABLE IF NOT EXISTS public.municipios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_ibge INTEGER UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  uf VARCHAR(2) NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  populacao INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONFIGURAÇÕES DO SISTEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_audio_enabled BOOLEAN DEFAULT true,
  auto_play_audio BOOLEAN DEFAULT true,
  gmail_api_configured BOOLEAN DEFAULT false,
  gmail_notification_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  alert_email TEXT,
  alert_enabled BOOLEAN DEFAULT true,
  alert_threshold NUMERIC DEFAULT 0.30,
  vimeo_history_url TEXT,
  daily_report_enabled BOOLEAN DEFAULT false,
  weekly_report_enabled BOOLEAN DEFAULT false,
  monthly_report_enabled BOOLEAN DEFAULT false,
  ml_accuracy_threshold NUMERIC DEFAULT 0.70,
  ml_accuracy_alert_enabled BOOLEAN DEFAULT false,
  ml_accuracy_alert_email TEXT,
  ml_accuracy_last_alert TIMESTAMPTZ,
  doc_sync_time TEXT DEFAULT '03:00',
  doc_sync_alert_email TEXT,
  security_scan_enabled BOOLEAN DEFAULT true,
  security_alert_email TEXT,
  security_alert_threshold TEXT DEFAULT 'critical',
  last_security_scan TIMESTAMPTZ,
  whatsapp_target_phone TEXT,
  whatsapp_global_enabled BOOLEAN DEFAULT false,
  email_global_enabled BOOLEAN DEFAULT true,
  last_scheduled_scan TIMESTAMPTZ,
  last_scheduler_error TEXT,
  api_sync_enabled BOOLEAN DEFAULT true,
  api_sync_cron_hour TEXT DEFAULT '03',
  api_sync_cron_minute TEXT DEFAULT '00',
  api_sync_default_frequency TEXT DEFAULT 'daily',
  sms_enabled BOOLEAN DEFAULT true,
  sms_as_fallback BOOLEAN DEFAULT true,
  twilio_sms_number TEXT
);

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  environment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USUÁRIOS E AUTENTICAÇÃO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'pt-BR',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  role app_role DEFAULT 'user',
  invited_by UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.user_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  full_name TEXT,
  invitation_token TEXT,
  status TEXT DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.password_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banned_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  user_id UUID,
  user_email TEXT,
  violation_type TEXT NOT NULL,
  ban_reason TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_permanent BOOLEAN DEFAULT false,
  banned_at TIMESTAMPTZ DEFAULT now(),
  unbanned_at TIMESTAMPTZ,
  unbanned_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PWA (Progressive Web App)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pwa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT DEFAULT 'KnowRisk',
  theme_color TEXT DEFAULT '#1a1a2e',
  background_color TEXT DEFAULT '#0f0f1a',
  display TEXT DEFAULT 'standalone',
  orientation TEXT DEFAULT 'portrait',
  start_url TEXT DEFAULT '/',
  scope TEXT DEFAULT '/',
  icons JSONB DEFAULT '[]',
  shortcuts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  push_subscription JSONB,
  is_trusted BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phone, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.pwa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  phone TEXT,
  device_id UUID,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  invited_by UUID,
  status TEXT DEFAULT 'pending',
  message TEXT,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID,
  direction TEXT NOT NULL, -- 'inbound' or 'outbound'
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  phone TEXT,
  agent_slug TEXT,
  status TEXT DEFAULT 'active',
  context JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.pwa_conversation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.pwa_conversation_sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  key_topics TEXT[],
  sentiment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_conv_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  session_id TEXT,
  summary TEXT NOT NULL,
  topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pwa_user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  context_data JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  last_topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHAT E AGENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.communication_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_code TEXT UNIQUE NOT NULL,
  style_name TEXT NOT NULL,
  description TEXT,
  formality INTEGER DEFAULT 5,
  complexity INTEGER DEFAULT 5,
  empathy INTEGER DEFAULT 5,
  verbosity INTEGER DEFAULT 5,
  persona_description TEXT,
  use_bullet_points BOOLEAN DEFAULT true,
  use_examples BOOLEAN DEFAULT true,
  max_paragraph_length INTEGER DEFAULT 150,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  rag_collection TEXT NOT NULL,
  system_prompt TEXT,
  greeting_message TEXT,
  rejection_message TEXT,
  avatar_url TEXT,
  agent_color TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  match_threshold NUMERIC DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  capabilities JSONB DEFAULT '{}',
  allowed_tags TEXT[],
  forbidden_tags TEXT[],
  communication_style_id UUID REFERENCES public.communication_styles(id),
  regional_tone TEXT,
  location TEXT,
  humanization_level INTEGER DEFAULT 5,
  pause_level INTEGER DEFAULT 3,
  maieutic_level TEXT DEFAULT 'medium',
  deterministic_mode BOOLEAN DEFAULT false,
  pronunciation_set TEXT,
  pronunciation_rules JSONB,
  suggested_badges JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type TEXT UNIQUE NOT NULL,
  system_prompt_base TEXT,
  rejection_message TEXT,
  scope_topics TEXT[],
  match_threshold NUMERIC DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  phonetic_map JSONB,
  rag_priority_instruction TEXT,
  duplicate_similarity_threshold NUMERIC DEFAULT 0.95,
  total_documents INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  last_document_added TIMESTAMPTZ,
  document_tags_data JSONB,
  health_status TEXT DEFAULT 'healthy',
  health_issues JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_name TEXT,
  message_count INTEGER DEFAULT 0,
  audio_plays INTEGER DEFAULT 0,
  topics TEXT[],
  started_at TIMESTAMPTZ DEFAULT now(),
  last_interaction TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_filename_pattern TEXT NOT NULL,
  suggested_chat TEXT NOT NULL,
  corrected_chat TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.5,
  correction_count INTEGER DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.chat_agents(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  phrase_type TEXT NOT NULL,
  replacement TEXT,
  category TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_pronunciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.chat_agents(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  approximate TEXT NOT NULL,
  ipa TEXT,
  category TEXT,
  variations TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  chat_type TEXT,
  messages JSONB DEFAULT '[]',
  sentiment_score NUMERIC,
  sentiment_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_chat_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT,
  preferred_agent TEXT,
  cognitive_level INTEGER DEFAULT 3,
  language TEXT DEFAULT 'pt-BR',
  voice_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOCUMENTOS E RAG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_text TEXT NOT NULL,
  text_preview TEXT,
  target_chat TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  processing_progress NUMERIC DEFAULT 0,
  total_words INTEGER,
  total_chunks INTEGER,
  ai_summary TEXT,
  ai_title TEXT,
  original_title TEXT,
  title_was_renamed BOOLEAN DEFAULT false,
  rename_reason TEXT,
  renamed_at TIMESTAMPTZ,
  title_source TEXT,
  needs_title_review BOOLEAN DEFAULT false,
  content_hash TEXT,
  is_inserted BOOLEAN DEFAULT false,
  inserted_in_chat TEXT,
  inserted_at TIMESTAMPTZ,
  implementation_status TEXT,
  redirected_from TEXT,
  is_readable BOOLEAN DEFAULT true,
  readability_score NUMERIC,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_type TEXT NOT NULL,
  confidence NUMERIC DEFAULT 1.0,
  source TEXT,
  parent_tag_id UUID REFERENCES public.document_tags(id),
  synonyms TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER DEFAULT 1,
  change_type TEXT NOT NULL,
  log_message TEXT NOT NULL,
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  snapshot_id TEXT,
  storage_reference_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_routing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  original_category TEXT NOT NULL,
  final_category TEXT NOT NULL,
  action_type TEXT NOT NULL,
  scope_changed BOOLEAN DEFAULT false,
  disclaimer_shown BOOLEAN DEFAULT false,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_onboarding_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  total_suggestions INTEGER,
  auto_applied_count INTEGER,
  highest_confidence NUMERIC,
  avg_confidence NUMERIC,
  suggested_taxonomies JSONB,
  applied_taxonomies JSONB,
  source_text_preview TEXT,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TAXONOMIA E TAGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.global_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.global_taxonomy(id),
  level INTEGER DEFAULT 0,
  color TEXT,
  icon TEXT,
  keywords TEXT[],
  synonyms TEXT[],
  status TEXT DEFAULT 'active',
  version INTEGER DEFAULT 1,
  auto_created BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  taxonomy_id UUID NOT NULL REFERENCES public.global_taxonomy(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  confidence NUMERIC DEFAULT 1.0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_id, entity_type, taxonomy_id)
);

CREATE TABLE IF NOT EXISTS public.agent_tag_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.chat_agents(id) ON DELETE CASCADE,
  taxonomy_id UUID NOT NULL REFERENCES public.global_taxonomy(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  include_children BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profile_taxonomies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  taxonomy_id UUID NOT NULL REFERENCES public.global_taxonomy(id) ON DELETE CASCADE,
  proficiency_level INTEGER DEFAULT 1,
  interest_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, taxonomy_id)
);

-- ============================================================
-- MACHINE LEARNING E SUGESTÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ml_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  taxonomy_code TEXT NOT NULL,
  taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  correlation_strength NUMERIC DEFAULT 0.5,
  occurrence_count INTEGER DEFAULT 1,
  source TEXT NOT NULL,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_tag_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  confidence NUMERIC NOT NULL,
  source TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_tag_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID,
  entity_id UUID,
  taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  feedback_type TEXT NOT NULL,
  user_id UUID,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_code TEXT NOT NULL,
  restriction_type TEXT NOT NULL,
  target_code TEXT,
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.taxonomy_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  confidence NUMERIC NOT NULL,
  source TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDICADORES ECONÔMICOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_api_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  base_url TEXT NOT NULL,
  description TEXT,
  documentation_url TEXT,
  auth_type TEXT DEFAULT 'none',
  rate_limit INTEGER,
  rate_limit_period TEXT,
  is_active BOOLEAN DEFAULT true,
  health_status TEXT DEFAULT 'unknown',
  last_health_check TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  frequency TEXT,
  is_regional BOOLEAN DEFAULT false,
  api_id UUID REFERENCES public.system_api_registry(id),
  cron_schedule TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.indicator_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.economic_indicators(id) ON DELETE CASCADE,
  reference_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, reference_date)
);

CREATE TABLE IF NOT EXISTS public.indicator_regional_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.economic_indicators(id) ON DELETE CASCADE,
  uf_code INTEGER NOT NULL REFERENCES public.brazilian_ufs(uf_code),
  reference_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, uf_code, reference_date)
);

CREATE TABLE IF NOT EXISTS public.api_test_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT DEFAULT 'custom',
  base_url TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  is_functional BOOLEAN,
  http_status INTEGER,
  error_message TEXT,
  test_timestamp TIMESTAMPTZ,
  last_raw_response JSONB,
  all_variables JSONB,
  selected_variables JSONB,
  implementation_params JSONB,
  discovered_period_start DATE,
  discovered_period_end DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.market_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  sentiment_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONTEXTOS E PERFIS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.context_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL DEFAULT '',
  prompt_additions TEXT,
  antiprompt TEXT,
  tone TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  match_threshold NUMERIC DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  detection_keywords TEXT[],
  detection_priority INTEGER DEFAULT 0,
  taxonomy_codes TEXT[],
  maieutic_enabled BOOLEAN DEFAULT true,
  initial_cognitive_level INTEGER DEFAULT 3,
  min_cognitive_level INTEGER DEFAULT 1,
  max_cognitive_level INTEGER DEFAULT 5,
  adaptation_speed TEXT DEFAULT 'medium',
  auto_detect_region BOOLEAN DEFAULT false,
  default_region_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.context_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID REFERENCES public.context_profiles(id) ON DELETE CASCADE,
  rule_type TEXT DEFAULT 'keyword',
  rule_value TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ANÁLISE E MÉTRICAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deterministic_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  chat_type TEXT NOT NULL,
  original_message TEXT NOT NULL,
  classification TEXT NOT NULL,
  question_type TEXT,
  refactored_version TEXT,
  analysis_reason TEXT,
  conversation_id UUID REFERENCES public.conversation_history(id),
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maieutic_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  message_id TEXT,
  context_code TEXT,
  cognitive_mode TEXT DEFAULT 'adaptive',
  questions_asked INTEGER DEFAULT 0,
  response_length INTEGER,
  pillbox_count INTEGER DEFAULT 0,
  detected_categories TEXT[],
  user_asked_clarification BOOLEAN DEFAULT false,
  user_confirmed_understanding BOOLEAN DEFAULT false,
  conversation_continued BOOLEAN,
  time_to_next_message INTEGER,
  next_message_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maieutic_training_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  category_icon TEXT,
  display_order INTEGER,
  behavioral_instructions TEXT,
  positive_directives TEXT,
  antiprompt TEXT,
  combination_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rag_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  query TEXT NOT NULL,
  chat_type TEXT,
  chunks_retrieved INTEGER,
  max_similarity NUMERIC,
  avg_similarity NUMERIC,
  response_time_ms INTEGER,
  documents_matched TEXT[],
  was_helpful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.typing_latency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  message_length INTEGER,
  typing_time_ms INTEGER,
  words_per_minute NUMERIC,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body_template TEXT NOT NULL,
  variables TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  categories JSONB DEFAULT '{}',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  template_id UUID REFERENCES public.notification_templates(id),
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_logic_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_fallback_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_channel TEXT NOT NULL,
  fallback_channel TEXT NOT NULL,
  fallback_delay_minutes INTEGER DEFAULT 5,
  max_retries INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_fallback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_notification_id UUID,
  fallback_channel TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SEGURANÇA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.security_scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  finding TEXT NOT NULL,
  details JSONB,
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  request_data JSONB,
  severity TEXT DEFAULT 'medium',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  threshold INTEGER,
  time_window_minutes INTEGER,
  notification_channels TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_severity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_result_id UUID,
  old_severity TEXT,
  new_severity TEXT,
  changed_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL,
  value TEXT NOT NULL,
  reason TEXT,
  created_by UUID,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_shield_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shield_name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AUDITORIA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id UUID REFERENCES public.system_api_registry(id),
  api_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  action_description TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  http_status INTEGER,
  execution_time_ms INTEGER,
  records_affected INTEGER,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  error_stack TEXT,
  environment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schema_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_schema JSONB,
  new_schema JSONB,
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tag_modification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  taxonomy_id UUID,
  old_values JSONB,
  new_values JSONB,
  modified_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tag_management_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  taxonomy_id UUID,
  data JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suggestion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID,
  action TEXT NOT NULL,
  actor_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invitation_channel_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES public.user_invitations(id),
  invitation_token TEXT,
  action TEXT NOT NULL,
  actor_user_id UUID,
  old_values JSONB,
  new_values JSONB,
  computed_policy JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONTEÚDO E MÍDIA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audio_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  storage_path TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.podcast_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT,
  topics TEXT[],
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.section_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  title TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.section_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.section_contents(id),
  version INTEGER NOT NULL,
  content TEXT,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.section_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID,
  audio_url TEXT NOT NULL,
  voice_id TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id TEXT NOT NULL,
  prompt_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.image_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id TEXT NOT NULL,
  prompt_key TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  cached BOOLEAN DEFAULT false,
  generation_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tooltip_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tooltip_key TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.presentation_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  script_content TEXT NOT NULL,
  notes TEXT,
  duration_estimate INTEGER,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LÉXICO E PRONUNCIAÇÃO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lexicon_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  term_normalized TEXT NOT NULL,
  definition TEXT NOT NULL,
  definition_simple TEXT,
  part_of_speech TEXT,
  pronunciation_ipa TEXT,
  pronunciation_phonetic TEXT,
  audio_url TEXT,
  synonyms TEXT[],
  antonyms TEXT[],
  related_terms TEXT[],
  domain TEXT[],
  example_usage TEXT,
  register TEXT,
  source TEXT,
  taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phonetic_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  replacement TEXT NOT NULL,
  context TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regional_pronunciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  region_code TEXT NOT NULL,
  pronunciation TEXT NOT NULL,
  audio_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regional_tone_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  rule_value TEXT NOT NULL,
  examples TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.taxonomy_phonetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  ipa TEXT,
  phonetic TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.speech_humanization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  original TEXT NOT NULL,
  humanized TEXT NOT NULL,
  context TEXT,
  frequency NUMERIC DEFAULT 0.5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ONTOLOGIA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ontology_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  definition TEXT,
  parent_id UUID REFERENCES public.ontology_concepts(id),
  taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ontology_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.ontology_concepts(id),
  predicate TEXT NOT NULL,
  object_id UUID NOT NULL REFERENCES public.ontology_concepts(id),
  weight NUMERIC DEFAULT 1.0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DEEP SEARCH E CONHECIMENTO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deep_search_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  query_hash TEXT,
  answer TEXT NOT NULL,
  source_type TEXT,
  source_name TEXT,
  source_url TEXT,
  confidence NUMERIC,
  embedding vector(1536),
  auto_tags TEXT[],
  verified BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  primary_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  variables TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CRM E VISITAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_name TEXT NOT NULL,
  lead_email TEXT,
  lead_phone TEXT,
  presentation_topic TEXT NOT NULL,
  salesman_id UUID,
  session_id TEXT,
  status TEXT DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  interactions_count INTEGER,
  audio_transcript TEXT,
  summary TEXT,
  notes TEXT,
  summary_sent_email BOOLEAN DEFAULT false,
  summary_sent_whatsapp BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  contact_type TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- VERSIONAMENTO E SYNC
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  version TEXT NOT NULL,
  changelog TEXT,
  is_current BOOLEAN DEFAULT true,
  released_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.version_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  changes JSONB DEFAULT '[]',
  author TEXT,
  release_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentation_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  triggered_by TEXT,
  status TEXT NOT NULL,
  current_phase TEXT,
  progress NUMERIC DEFAULT 0,
  phases_completed JSONB,
  changes_detected JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_increments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  increment_type TEXT NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  prefix TEXT,
  suffix TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auto_preload_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT false,
  check_interval_minutes INTEGER DEFAULT 60,
  last_check TIMESTAMPTZ,
  last_preload TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INTEGRIDADE E DEBUG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.integrity_check_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  check_timestamp TIMESTAMPTZ DEFAULT now(),
  modules_checked TEXT[],
  issues_found JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT NOT NULL,
  message TEXT NOT NULL,
  component TEXT,
  data JSONB,
  environment TEXT,
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  scroll_x INTEGER,
  scroll_y INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credits_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id TEXT,
  operation_type TEXT NOT NULL,
  credits_consumed NUMERIC,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CLASSIFICAÇÃO E JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reclassification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress NUMERIC DEFAULT 0,
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tag_merge_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  target_taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  merge_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suggestion_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_text TEXT NOT NULL,
  chat_type TEXT,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  session_id TEXT,
  click_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MÉTRICAS E ANALYTICS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.taxonomy_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  metric_date DATE NOT NULL,
  document_count INTEGER DEFAULT 0,
  query_count INTEGER DEFAULT 0,
  avg_confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(taxonomy_id, metric_date)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  conversations_started INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_quality_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  phone_number TEXT,
  quality_score NUMERIC,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_tier_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_tier TEXT NOT NULL,
  daily_limit INTEGER,
  messages_sent_today INTEGER DEFAULT 0,
  tier_updated_at TIMESTAMPTZ,
  next_tier_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PAC/PMC (Previsão de Consumo)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pac_pmc_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf_code INTEGER,
  category TEXT NOT NULL,
  pac_code TEXT,
  pmc_code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pac_valores_estimados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf_code INTEGER,
  category TEXT NOT NULL,
  reference_date DATE NOT NULL,
  estimated_value NUMERIC,
  confidence NUMERIC,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pmc_valores_reais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf_code INTEGER,
  category TEXT NOT NULL,
  reference_date DATE NOT NULL,
  real_value NUMERIC,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Índices para busca de documentos
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_target_chat ON public.documents(target_chat);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

-- Índices para chunks e embeddings
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);

-- Índices para taxonomia
CREATE INDEX IF NOT EXISTS idx_global_taxonomy_code ON public.global_taxonomy(code);
CREATE INDEX IF NOT EXISTS idx_global_taxonomy_parent_id ON public.global_taxonomy(parent_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON public.entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_taxonomy ON public.entity_tags(taxonomy_id);

-- Índices para conversações
CREATE INDEX IF NOT EXISTS idx_conversation_history_session ON public.conversation_history(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_chat_type ON public.conversation_history(chat_type);

-- Índices para PWA
CREATE INDEX IF NOT EXISTS idx_pwa_users_phone ON public.pwa_users(phone);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_token ON public.pwa_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_pwa_user_devices_phone ON public.pwa_user_devices(phone);

-- Índices para agentes
CREATE INDEX IF NOT EXISTS idx_chat_agents_slug ON public.chat_agents(slug);
CREATE INDEX IF NOT EXISTS idx_chat_agents_is_active ON public.chat_agents(is_active);

-- Índices para indicadores econômicos
CREATE INDEX IF NOT EXISTS idx_indicator_values_indicator ON public.indicator_values(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_values_date ON public.indicator_values(reference_date DESC);
CREATE INDEX IF NOT EXISTS idx_indicator_regional_values_indicator ON public.indicator_regional_values(indicator_id);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_created_at ON public.api_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON public.debug_logs(created_at DESC);

COMMENT ON SCHEMA public IS 'KnowRisk - Strategic Business Intelligence Platform - Schema migrado em 2026-01-13';
