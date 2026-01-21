-- Comprehensive RLS policy update to include superadmin role

-- user_activity_logs: Allow superadmin to read
DROP POLICY IF EXISTS "Admins can read all activity logs" ON public.user_activity_logs;
CREATE POLICY "Admins can read all activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- security_scan_results: Allow superadmin full access
DROP POLICY IF EXISTS "Admins can read security scan results" ON public.security_scan_results;
CREATE POLICY "Admins can read security scan results" 
ON public.security_scan_results 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins can delete security scan results" ON public.security_scan_results;
CREATE POLICY "Admins can delete security scan results" 
ON public.security_scan_results 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins can insert security scan results" ON public.security_scan_results;
CREATE POLICY "Admins can insert security scan results" 
ON public.security_scan_results 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- conversation_history: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read all conversations" ON public.conversation_history;
CREATE POLICY "Admins can read all conversations" 
ON public.conversation_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- document_chunks: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage document chunks" ON public.document_chunks;
CREATE POLICY "Admins can manage document chunks" 
ON public.document_chunks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- document_tags: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage document tags" ON public.document_tags;
CREATE POLICY "Admins can manage document tags" 
ON public.document_tags 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- chat_config: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage chat config" ON public.chat_config;
CREATE POLICY "Admins can manage chat config" 
ON public.chat_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- notification_logs: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read notification logs" ON public.notification_logs;
CREATE POLICY "Admins can read notification logs" 
ON public.notification_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- notification_preferences: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage notification preferences" ON public.notification_preferences;
CREATE POLICY "Admins can manage notification preferences" 
ON public.notification_preferences 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- notification_templates: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage notification templates" ON public.notification_templates;
CREATE POLICY "Admins can manage notification templates" 
ON public.notification_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- admin_notifications: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage admin notifications" ON public.admin_notifications;
CREATE POLICY "Admins can manage admin notifications" 
ON public.admin_notifications 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- contact_messages: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins can manage contact messages" 
ON public.contact_messages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- user_registrations: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage user registrations" ON public.user_registrations;
CREATE POLICY "Admins can manage user registrations" 
ON public.user_registrations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- tag_merge_rules: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage tag merge rules" ON public.tag_merge_rules;
CREATE POLICY "Admins can manage tag merge rules" 
ON public.tag_merge_rules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- tag_modification_logs: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read tag modification logs" ON public.tag_modification_logs;
CREATE POLICY "Admins can read tag modification logs" 
ON public.tag_modification_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- section_contents: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage section contents" ON public.section_contents;
CREATE POLICY "Admins can manage section contents" 
ON public.section_contents 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- tooltip_contents: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage tooltip contents" ON public.tooltip_contents;
CREATE POLICY "Admins can manage tooltip contents" 
ON public.tooltip_contents 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- generated_images: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage generated images" ON public.generated_images;
CREATE POLICY "Admins can manage generated images" 
ON public.generated_images 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- rag_analytics: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read RAG analytics" ON public.rag_analytics;
CREATE POLICY "Admins can read RAG analytics" 
ON public.rag_analytics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- deterministic_analysis: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage deterministic analysis" ON public.deterministic_analysis;
CREATE POLICY "Admins can manage deterministic analysis" 
ON public.deterministic_analysis 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- suggestion_audit: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage suggestion audit" ON public.suggestion_audit;
CREATE POLICY "Admins can manage suggestion audit" 
ON public.suggestion_audit 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- integrity_check_log: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read integrity check logs" ON public.integrity_check_log;
CREATE POLICY "Admins can read integrity check logs" 
ON public.integrity_check_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- document_routing_log: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read document routing logs" ON public.document_routing_log;
CREATE POLICY "Admins can read document routing logs" 
ON public.document_routing_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- chat_routing_rules: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage chat routing rules" ON public.chat_routing_rules;
CREATE POLICY "Admins can manage chat routing rules" 
ON public.chat_routing_rules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- taxonomy_rules: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage taxonomy rules" ON public.taxonomy_rules;
CREATE POLICY "Admins can manage taxonomy rules" 
ON public.taxonomy_rules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- economic_indicators: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage economic indicators" ON public.economic_indicators;
CREATE POLICY "Admins can manage economic indicators" 
ON public.economic_indicators 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- indicator_values: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage indicator values" ON public.indicator_values;
CREATE POLICY "Admins can manage indicator values" 
ON public.indicator_values 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- system_api_registry: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage API registry" ON public.system_api_registry;
CREATE POLICY "Admins can manage API registry" 
ON public.system_api_registry 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- market_news: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage market news" ON public.market_news;
CREATE POLICY "Admins can manage market news" 
ON public.market_news 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- maieutic_training_categories: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage maieutic categories" ON public.maieutic_training_categories;
CREATE POLICY "Admins can manage maieutic categories" 
ON public.maieutic_training_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- regional_tone_rules: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage regional tone rules" ON public.regional_tone_rules;
CREATE POLICY "Admins can manage regional tone rules" 
ON public.regional_tone_rules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- document_versions: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage document versions" ON public.document_versions;
CREATE POLICY "Admins can manage document versions" 
ON public.document_versions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- credits_usage: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read credits usage" ON public.credits_usage;
CREATE POLICY "Admins can read credits usage" 
ON public.credits_usage 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- system_versions: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read system versions" ON public.system_versions;
CREATE POLICY "Admins can read system versions" 
ON public.system_versions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- version_control: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage version control" ON public.version_control;
CREATE POLICY "Admins can manage version control" 
ON public.version_control 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- documentation_sync_log: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read documentation sync logs" ON public.documentation_sync_log;
CREATE POLICY "Admins can read documentation sync logs" 
ON public.documentation_sync_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- documentation_versions: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage documentation versions" ON public.documentation_versions;
CREATE POLICY "Admins can manage documentation versions" 
ON public.documentation_versions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- feature_flags: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins can manage feature flags" 
ON public.feature_flags 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- podcast_contents: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage podcast contents" ON public.podcast_contents;
CREATE POLICY "Admins can manage podcast contents" 
ON public.podcast_contents 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- reply_templates: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage reply templates" ON public.reply_templates;
CREATE POLICY "Admins can manage reply templates" 
ON public.reply_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- section_audio: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage section audio" ON public.section_audio;
CREATE POLICY "Admins can manage section audio" 
ON public.section_audio 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- section_content_versions: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage section content versions" ON public.section_content_versions;
CREATE POLICY "Admins can manage section content versions" 
ON public.section_content_versions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- security_alert_config: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage security alert config" ON public.security_alert_config;
CREATE POLICY "Admins can manage security alert config" 
ON public.security_alert_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- security_severity_history: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read security severity history" ON public.security_severity_history;
CREATE POLICY "Admins can read security severity history" 
ON public.security_severity_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- tag_management_events: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage tag management events" ON public.tag_management_events;
CREATE POLICY "Admins can manage tag management events" 
ON public.tag_management_events 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- notification_logic_config: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage notification logic config" ON public.notification_logic_config;
CREATE POLICY "Admins can manage notification logic config" 
ON public.notification_logic_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- image_analytics: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read image analytics" ON public.image_analytics;
CREATE POLICY "Admins can read image analytics" 
ON public.image_analytics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- suggestion_clicks: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read suggestion clicks" ON public.suggestion_clicks;
CREATE POLICY "Admins can read suggestion clicks" 
ON public.suggestion_clicks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- system_increments: Allow superadmin access
DROP POLICY IF EXISTS "Admins can read system increments" ON public.system_increments;
CREATE POLICY "Admins can read system increments" 
ON public.system_increments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- auto_preload_config: Allow superadmin access
DROP POLICY IF EXISTS "Admins can manage auto preload config" ON public.auto_preload_config;
CREATE POLICY "Admins can manage auto preload config" 
ON public.auto_preload_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));