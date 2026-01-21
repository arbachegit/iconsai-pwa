-- ============================================================
-- KNOWRISK - SCRIPT DE MIGRAÇÃO COMPLETO
-- Parte 3: Políticas RLS (Row Level Security)
-- Gerado em: 2026-01-13
-- ============================================================

-- ============================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_pronunciations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tag_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_test_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_search_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deterministic_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_onboarding_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_routing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_regional_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lexicon_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maieutic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maieutic_training_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_tag_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_tag_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_fallback_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_fallback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logic_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ontology_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ontology_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phonetic_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_conv_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclassification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_pronunciations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_tone_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_severity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_shield_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_humanization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_api_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_management_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_merge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_modification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_phonetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooltip_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_latency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chat_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS PARA ADMINISTRAÇÃO
-- ============================================================

-- Admin Notifications
CREATE POLICY "Admins can manage admin notifications" ON public.admin_notifications
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Admin Settings
CREATE POLICY "Only admins can read admin settings" ON public.admin_settings
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Only admins can update admin settings" ON public.admin_settings
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- App Config
CREATE POLICY "Anyone can read app config" ON public.app_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage app config" ON public.app_config
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- POLÍTICAS PARA AGENTES E CHAT
-- ============================================================

-- Chat Agents
CREATE POLICY "Anyone can read active agents" ON public.chat_agents
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all agents" ON public.chat_agents
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Agent Phrases
CREATE POLICY "System can read phrases" ON public.agent_phrases
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage agent phrases" ON public.agent_phrases
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Agent Pronunciations
CREATE POLICY "System can read pronunciations" ON public.agent_pronunciations
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage agent pronunciations" ON public.agent_pronunciations
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Agent Tag Profiles
CREATE POLICY "Public can read agent_tag_profiles" ON public.agent_tag_profiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage agent_tag_profiles" ON public.agent_tag_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Chat Config
CREATE POLICY "Anyone can read chat config" ON public.chat_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage chat config" ON public.chat_config
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Communication Styles
CREATE POLICY "Anyone can read communication styles" ON public.communication_styles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage communication styles" ON public.communication_styles
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Conversation History
CREATE POLICY "Anyone can read and write conversations" ON public.conversation_history
  FOR ALL USING (true);

-- Chat Analytics
CREATE POLICY "Anyone can read and write chat analytics" ON public.chat_analytics
  FOR ALL USING (true);

-- ============================================================
-- POLÍTICAS PARA DOCUMENTOS
-- ============================================================

-- Documents
CREATE POLICY "Anyone can read documents" ON public.documents
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update documents" ON public.documents
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete documents" ON public.documents
  FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Document Chunks
CREATE POLICY "Anyone can read document chunks" ON public.document_chunks
  FOR SELECT USING (true);

CREATE POLICY "System can manage document chunks" ON public.document_chunks
  FOR ALL USING (true);

-- Document Tags
CREATE POLICY "Anyone can read document tags" ON public.document_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage document tags" ON public.document_tags
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'editor'));

-- Document Versions
CREATE POLICY "Anyone can read document versions" ON public.document_versions
  FOR SELECT USING (true);

CREATE POLICY "System can manage document versions" ON public.document_versions
  FOR ALL USING (true);

-- ============================================================
-- POLÍTICAS PARA TAXONOMIA
-- ============================================================

-- Global Taxonomy
CREATE POLICY "Anyone can read taxonomy" ON public.global_taxonomy
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage taxonomy" ON public.global_taxonomy
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Entity Tags
CREATE POLICY "Anyone can read entity tags" ON public.entity_tags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage entity tags" ON public.entity_tags
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================
-- POLÍTICAS PARA PWA
-- ============================================================

-- PWA Users
CREATE POLICY "PWA users can read their own data" ON public.pwa_users
  FOR SELECT USING (true);

CREATE POLICY "System can manage PWA users" ON public.pwa_users
  FOR ALL USING (true);

-- PWA Devices
CREATE POLICY "Anyone can read PWA devices" ON public.pwa_devices
  FOR SELECT USING (true);

CREATE POLICY "System can manage PWA devices" ON public.pwa_devices
  FOR ALL USING (true);

-- PWA User Devices
CREATE POLICY "Anyone can read PWA user devices" ON public.pwa_user_devices
  FOR SELECT USING (true);

CREATE POLICY "System can manage PWA user devices" ON public.pwa_user_devices
  FOR ALL USING (true);

-- PWA Sessions
CREATE POLICY "System can manage PWA sessions" ON public.pwa_sessions
  FOR ALL USING (true);

-- PWA Config
CREATE POLICY "Anyone can read PWA config" ON public.pwa_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage PWA config" ON public.pwa_config
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- PWA Conversation Sessions
CREATE POLICY "System can manage PWA conversation sessions" ON public.pwa_conversation_sessions
  FOR ALL USING (true);

-- PWA Conversation Messages
CREATE POLICY "System can manage PWA conversation messages" ON public.pwa_conversation_messages
  FOR ALL USING (true);

-- PWA Messages
CREATE POLICY "System can manage PWA messages" ON public.pwa_messages
  FOR ALL USING (true);

-- ============================================================
-- POLÍTICAS PARA INDICADORES ECONÔMICOS
-- ============================================================

-- Economic Indicators
CREATE POLICY "Anyone can read economic indicators" ON public.economic_indicators
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage economic indicators" ON public.economic_indicators
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Indicator Values
CREATE POLICY "Anyone can read indicator values" ON public.indicator_values
  FOR SELECT USING (true);

CREATE POLICY "System can manage indicator values" ON public.indicator_values
  FOR ALL USING (true);

-- Indicator Regional Values
CREATE POLICY "Anyone can read regional indicator values" ON public.indicator_regional_values
  FOR SELECT USING (true);

CREATE POLICY "System can manage regional indicator values" ON public.indicator_regional_values
  FOR ALL USING (true);

-- System API Registry
CREATE POLICY "Anyone can read API registry" ON public.system_api_registry
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage API registry" ON public.system_api_registry
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- POLÍTICAS PARA ML E SUGESTÕES
-- ============================================================

-- ML Correlations
CREATE POLICY "Anyone can read ML correlations" ON public.ml_correlations
  FOR SELECT USING (true);

CREATE POLICY "System can manage ML correlations" ON public.ml_correlations
  FOR ALL USING (true);

-- ML Tag Suggestions
CREATE POLICY "Anyone can read ML suggestions" ON public.ml_tag_suggestions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage ML suggestions" ON public.ml_tag_suggestions
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'editor'));

-- ML Tag Feedback
CREATE POLICY "System can manage ML feedback" ON public.ml_tag_feedback
  FOR ALL USING (true);

-- Taxonomy Suggestions
CREATE POLICY "Anyone can read taxonomy suggestions" ON public.taxonomy_suggestions
  FOR SELECT USING (true);

CREATE POLICY "System can manage taxonomy suggestions" ON public.taxonomy_suggestions
  FOR ALL USING (true);

-- ============================================================
-- POLÍTICAS PARA NOTIFICAÇÕES
-- ============================================================

-- Notification Templates
CREATE POLICY "Anyone can read notification templates" ON public.notification_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Notification Preferences
CREATE POLICY "Users can read their own notification preferences" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Notification Logs
CREATE POLICY "Users can read their own notification logs" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage notification logs" ON public.notification_logs
  FOR ALL USING (true);

-- ============================================================
-- POLÍTICAS PARA SEGURANÇA
-- ============================================================

-- Security Scan Results
CREATE POLICY "Admins can view security scans" ON public.security_scan_results
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can manage security scans" ON public.security_scan_results
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Security Violations
CREATE POLICY "Admins can view violations" ON public.security_violations
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Security Audit Log
CREATE POLICY "Admins can view audit logs" ON public.security_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Banned Devices
CREATE POLICY "Admins can manage banned devices" ON public.banned_devices
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- POLÍTICAS PARA USUÁRIOS
-- ============================================================

-- User Roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'superadmin'));

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Preferences
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- User Invitations
CREATE POLICY "Admins can manage invitations" ON public.user_invitations
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Anyone can read invitations by token" ON public.user_invitations
  FOR SELECT USING (true);

-- ============================================================
-- POLÍTICAS PARA CONTEÚDO
-- ============================================================

-- Audio Contents
CREATE POLICY "Anyone can read audio contents" ON public.audio_contents
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage audio contents" ON public.audio_contents
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Section Contents
CREATE POLICY "Anyone can read section contents" ON public.section_contents
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage section contents" ON public.section_contents
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Tooltip Contents
CREATE POLICY "Anyone can read tooltips" ON public.tooltip_contents
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tooltips" ON public.tooltip_contents
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- POLÍTICAS PARA LÉXICO
-- ============================================================

-- Lexicon Terms
CREATE POLICY "Anyone can read lexicon terms" ON public.lexicon_terms
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage lexicon terms" ON public.lexicon_terms
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Phonetic Rules
CREATE POLICY "Anyone can read phonetic rules" ON public.phonetic_rules
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage phonetic rules" ON public.phonetic_rules
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- POLÍTICAS PARA CONTEXTOS
-- ============================================================

-- Context Profiles
CREATE POLICY "Anyone can read context profiles" ON public.context_profiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage context profiles" ON public.context_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Context Detection Rules
CREATE POLICY "Anyone can read detection rules" ON public.context_detection_rules
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage detection rules" ON public.context_detection_rules
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- POLÍTICAS PARA LOGS E DEBUG
-- ============================================================

-- Debug Logs
CREATE POLICY "Anyone can insert debug logs" ON public.debug_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read debug logs" ON public.debug_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- API Audit Logs
CREATE POLICY "Admins can view audit logs" ON public.api_audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "System can insert audit logs" ON public.api_audit_logs
  FOR INSERT WITH CHECK (true);

-- RAG Analytics
CREATE POLICY "Anyone can insert RAG analytics" ON public.rag_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read RAG analytics" ON public.rag_analytics
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- POLÍTICAS PARA DADOS PÚBLICOS
-- ============================================================

-- Estados (referência)
CREATE POLICY "Anyone can read estados" ON public.estados
  FOR SELECT USING (true);

-- Brazilian UFs (referência)
CREATE POLICY "Anyone can read brazilian_ufs" ON public.brazilian_ufs
  FOR SELECT USING (true);

-- Municípios (referência)
CREATE POLICY "Anyone can read municipios" ON public.municipios
  FOR SELECT USING (true);

-- Deep Search Knowledge
CREATE POLICY "Anyone can read deep search knowledge" ON public.deep_search_knowledge
  FOR SELECT USING (true);

CREATE POLICY "System can manage deep search knowledge" ON public.deep_search_knowledge
  FOR ALL USING (true);

-- Market News
CREATE POLICY "Anyone can read market news" ON public.market_news
  FOR SELECT USING (true);

CREATE POLICY "System can manage market news" ON public.market_news
  FOR ALL USING (true);

-- ============================================================
-- POLÍTICAS PARA MÉTRICAS
-- ============================================================

-- Maieutic Metrics
CREATE POLICY "Anyone can insert maieutic metrics" ON public.maieutic_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read maieutic metrics" ON public.maieutic_metrics
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Taxonomy Metrics Daily
CREATE POLICY "Anyone can read taxonomy metrics" ON public.taxonomy_metrics_daily
  FOR SELECT USING (true);

CREATE POLICY "System can manage taxonomy metrics" ON public.taxonomy_metrics_daily
  FOR ALL USING (true);

-- ============================================================
-- POLÍTICAS PARA ONTOLOGIA
-- ============================================================

-- Ontology Concepts
CREATE POLICY "Anyone can read ontology concepts" ON public.ontology_concepts
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage ontology concepts" ON public.ontology_concepts
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Ontology Relations
CREATE POLICY "Anyone can read ontology relations" ON public.ontology_relations
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage ontology relations" ON public.ontology_relations
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));
