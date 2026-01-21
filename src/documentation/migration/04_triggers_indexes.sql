-- ============================================================
-- KNOWRISK - SCRIPT DE MIGRAÇÃO COMPLETO
-- Parte 4: Triggers e Índices Adicionais
-- Gerado em: 2026-01-13
-- ============================================================

-- ============================================================
-- TRIGGERS DE ATUALIZAÇÃO AUTOMÁTICA
-- ============================================================

-- Trigger para updated_at em admin_settings
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em chat_agents
CREATE TRIGGER update_chat_agents_updated_at
  BEFORE UPDATE ON public.chat_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em chat_config
CREATE TRIGGER update_chat_config_updated_at
  BEFORE UPDATE ON public.chat_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em documents
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em global_taxonomy
CREATE TRIGGER update_global_taxonomy_updated_at
  BEFORE UPDATE ON public.global_taxonomy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em conversation_history
CREATE TRIGGER update_conversation_history_updated_at
  BEFORE UPDATE ON public.conversation_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em pwa_users
CREATE TRIGGER update_pwa_users_updated_at
  BEFORE UPDATE ON public.pwa_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em pwa_user_devices
CREATE TRIGGER update_pwa_user_devices_updated_at
  BEFORE UPDATE ON public.pwa_user_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em economic_indicators
CREATE TRIGGER update_economic_indicators_updated_at
  BEFORE UPDATE ON public.economic_indicators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em context_profiles
CREATE TRIGGER update_context_profiles_updated_at
  BEFORE UPDATE ON public.context_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em notification_templates
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em section_contents
CREATE TRIGGER update_section_contents_updated_at
  BEFORE UPDATE ON public.section_contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em communication_styles
CREATE TRIGGER update_communication_styles_updated_at
  BEFORE UPDATE ON public.communication_styles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER DE PROTEÇÃO DE ROLES
-- ============================================================

CREATE TRIGGER protect_role_updates
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION protect_role_changes();

-- ============================================================
-- TRIGGER DE CONTAGEM DE CHUNKS
-- ============================================================

CREATE TRIGGER update_document_chunks_count_insert
  AFTER INSERT ON public.document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_document_chunk_count();

CREATE TRIGGER update_document_chunks_count_delete
  AFTER DELETE ON public.document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_document_chunk_count();

-- ============================================================
-- FUNÇÃO PARA ATUALIZAR IMAGENS GERADAS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_generated_images_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_generated_images_updated_at
  BEFORE UPDATE ON public.generated_images
  FOR EACH ROW EXECUTE FUNCTION update_generated_images_updated_at();

CREATE TRIGGER update_section_audio_updated_at
  BEFORE UPDATE ON public.section_audio
  FOR EACH ROW EXECUTE FUNCTION update_generated_images_updated_at();

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índices para busca textual
CREATE INDEX IF NOT EXISTS idx_documents_filename_trgm ON public.documents USING gin(filename gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_ai_title_trgm ON public.documents USING gin(ai_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_global_taxonomy_name_trgm ON public.global_taxonomy USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lexicon_terms_term_trgm ON public.lexicon_terms USING gin(term gin_trgm_ops);

-- Índices para embeddings vetoriais (HNSW para busca mais rápida)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw ON public.document_chunks 
  USING hnsw(embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_deep_search_knowledge_embedding_hnsw ON public.deep_search_knowledge 
  USING hnsw(embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Índices compostos para queries frequentes
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity_composite ON public.entity_tags(entity_type, entity_id, taxonomy_id);
CREATE INDEX IF NOT EXISTS idx_indicator_values_composite ON public.indicator_values(indicator_id, reference_date DESC);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_active ON public.pwa_sessions(phone, is_active) WHERE is_active = true;

-- Índices para foreign keys (melhora JOINs)
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_fk ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_taxonomy_fk ON public.entity_tags(taxonomy_id);
CREATE INDEX IF NOT EXISTS idx_agent_tag_profiles_agent_fk ON public.agent_tag_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tag_profiles_taxonomy_fk ON public.agent_tag_profiles(taxonomy_id);

-- Índices para ordenação temporal
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON public.notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_tag_suggestions_created ON public.ml_tag_suggestions(created_at DESC);

-- Índices para filtros comuns
CREATE INDEX IF NOT EXISTS idx_documents_is_inserted ON public.documents(is_inserted) WHERE is_inserted = false;
CREATE INDEX IF NOT EXISTS idx_ml_tag_suggestions_pending ON public.ml_tag_suggestions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_global_taxonomy_active ON public.global_taxonomy(status) WHERE status = 'active';

-- ============================================================
-- HABILITAR REALTIME PARA TABELAS IMPORTANTES
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pwa_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pwa_conversation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- ============================================================
-- GRANTS PARA SERVICE ROLE
-- ============================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grants para authenticated
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grants para anon (leitura apenas em tabelas públicas)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.estados TO anon;
GRANT SELECT ON public.brazilian_ufs TO anon;
GRANT SELECT ON public.municipios TO anon;
GRANT SELECT ON public.chat_agents TO anon;
GRANT SELECT ON public.global_taxonomy TO anon;
GRANT SELECT ON public.economic_indicators TO anon;
GRANT SELECT ON public.indicator_values TO anon;

-- ============================================================
-- COMENTÁRIOS NA DOCUMENTAÇÃO
-- ============================================================

COMMENT ON TABLE public.documents IS 'Armazena documentos processados para RAG';
COMMENT ON TABLE public.document_chunks IS 'Chunks de documentos com embeddings vetoriais para busca semântica';
COMMENT ON TABLE public.global_taxonomy IS 'Taxonomia hierárquica global para classificação de conteúdo';
COMMENT ON TABLE public.entity_tags IS 'Relacionamento M:N entre entidades e taxonomias';
COMMENT ON TABLE public.chat_agents IS 'Configuração de agentes de chat com personalidade e escopo';
COMMENT ON TABLE public.pwa_users IS 'Usuários do PWA identificados por telefone';
COMMENT ON TABLE public.economic_indicators IS 'Indicadores econômicos do IPEA, BCB, IBGE';
COMMENT ON TABLE public.deep_search_knowledge IS 'Base de conhecimento para respostas rápidas';

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================

DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM pg_tables WHERE schemaname = 'public';
  SELECT COUNT(*) INTO function_count FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
  
  RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA ===';
  RAISE NOTICE 'Tabelas criadas: %', table_count;
  RAISE NOTICE 'Funções criadas: %', function_count;
  RAISE NOTICE 'Políticas RLS: %', policy_count;
END $$;
