-- ============================================================
-- KNOWRISK - SCRIPT DE EXPORTAÇÃO DE DADOS
-- Parte 5: Comandos para Exportar Dados do Banco Atual
-- Gerado em: 2026-01-13
-- ============================================================
-- IMPORTANTE: Execute estes comandos no banco ORIGEM para exportar dados
-- Use pg_dump ou COPY para gerar os arquivos de dados
-- ============================================================

-- ============================================================
-- OPÇÃO 1: USANDO pg_dump (Recomendado)
-- Execute no terminal/shell:
-- ============================================================

/*
# Exportar schema e dados completos
pg_dump "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-privileges \
  --file=knowrisk_data_export.sql

# Ou exportar tabela por tabela para melhor controle:
pg_dump "CONNECTION_STRING" --table=public.global_taxonomy --data-only --file=01_global_taxonomy.sql
pg_dump "CONNECTION_STRING" --table=public.documents --data-only --file=02_documents.sql
pg_dump "CONNECTION_STRING" --table=public.document_chunks --data-only --file=03_document_chunks.sql
# ... continue para todas as tabelas
*/

-- ============================================================
-- OPÇÃO 2: USANDO COPY TO (Execute via psql)
-- ============================================================

/*
-- Conecte ao banco e execute:

\COPY public.estados TO '/tmp/estados.csv' WITH CSV HEADER;
\COPY public.brazilian_ufs TO '/tmp/brazilian_ufs.csv' WITH CSV HEADER;
\COPY public.municipios TO '/tmp/municipios.csv' WITH CSV HEADER;
\COPY public.global_taxonomy TO '/tmp/global_taxonomy.csv' WITH CSV HEADER;
\COPY public.documents TO '/tmp/documents.csv' WITH CSV HEADER;
\COPY public.document_chunks TO '/tmp/document_chunks.csv' WITH CSV HEADER;
\COPY public.chat_agents TO '/tmp/chat_agents.csv' WITH CSV HEADER;
\COPY public.economic_indicators TO '/tmp/economic_indicators.csv' WITH CSV HEADER;
-- ... continue para todas as tabelas necessárias
*/

-- ============================================================
-- OPÇÃO 3: SELECT INTO para JSON (Via Supabase Dashboard ou API)
-- ============================================================

-- Exportar como JSON (execute no SQL Editor do Supabase):

-- Estados brasileiros
SELECT json_agg(t) FROM (SELECT * FROM public.estados) t;

-- UFs brasileiras
SELECT json_agg(t) FROM (SELECT * FROM public.brazilian_ufs) t;

-- Taxonomia global (importante manter ordem por parent_id)
SELECT json_agg(t ORDER BY level, code) FROM (
  SELECT * FROM public.global_taxonomy WHERE status = 'active'
) t;

-- Agentes de chat
SELECT json_agg(t) FROM (SELECT * FROM public.chat_agents WHERE is_active = true) t;

-- Estilos de comunicação
SELECT json_agg(t) FROM (SELECT * FROM public.communication_styles WHERE is_active = true) t;

-- Perfis de contexto
SELECT json_agg(t) FROM (SELECT * FROM public.context_profiles WHERE is_active = true) t;

-- Configurações de chat
SELECT json_agg(t) FROM (SELECT * FROM public.chat_config) t;

-- Documentos processados
SELECT json_agg(t) FROM (
  SELECT id, filename, target_chat, status, ai_summary, ai_title, total_words, total_chunks, created_at
  FROM public.documents 
  WHERE status = 'processed'
) t;

-- Indicadores econômicos
SELECT json_agg(t) FROM (SELECT * FROM public.economic_indicators) t;

-- Valores de indicadores (últimos 5 anos)
SELECT json_agg(t) FROM (
  SELECT * FROM public.indicator_values 
  WHERE reference_date >= (CURRENT_DATE - INTERVAL '5 years')
) t;

-- Léxico de termos
SELECT json_agg(t) FROM (SELECT * FROM public.lexicon_terms WHERE is_approved = true) t;

-- Regras fonéticas
SELECT json_agg(t) FROM (SELECT * FROM public.phonetic_rules WHERE is_active = true) t;

-- ============================================================
-- ORDEM DE IMPORTAÇÃO DOS DADOS (CRÍTICO!)
-- ============================================================

/*
A ordem de importação deve respeitar as foreign keys:

1. Tabelas de referência (sem dependências):
   - estados
   - brazilian_ufs
   - municipios
   - communication_styles
   - system_api_registry
   - app_config
   - feature_flags

2. Tabelas com auto-referência:
   - global_taxonomy (parent_id referencia a si mesma, importar por level)
   - ontology_concepts

3. Tabelas que dependem de global_taxonomy:
   - entity_tags
   - lexicon_terms
   - ml_correlations
   - profile_taxonomies
   - taxonomy_phonetics

4. Tabelas que dependem de communication_styles:
   - chat_agents
   - context_profiles

5. Tabelas que dependem de chat_agents:
   - agent_phrases
   - agent_pronunciations
   - agent_tag_profiles

6. Tabelas que dependem de system_api_registry:
   - economic_indicators
   - api_audit_logs

7. Tabelas que dependem de economic_indicators:
   - indicator_values
   - indicator_regional_values

8. Documentos e RAG:
   - documents
   - document_chunks (depende de documents)
   - document_tags (depende de documents)
   - document_versions (depende de documents)

9. Usuários e autenticação:
   - profiles
   - user_roles (depende de auth.users - cuidado!)
   - user_preferences
   - user_invitations

10. PWA:
    - pwa_users
    - pwa_devices
    - pwa_user_devices
    - pwa_sessions
    - pwa_conversation_sessions
    - pwa_conversation_messages

11. Conversações e analytics:
    - conversation_history
    - chat_analytics
    - deterministic_analysis
    - maieutic_metrics
    - rag_analytics

12. Notificações:
    - notification_templates
    - notification_preferences
    - notification_logs

13. Segurança e logs:
    - security_scan_results
    - security_audit_log
    - debug_logs
    - api_audit_logs
*/

-- ============================================================
-- SCRIPT DE VALIDAÇÃO PÓS-IMPORTAÇÃO
-- ============================================================

-- Execute após importar para validar integridade:

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verificar tabelas principais
  SELECT COUNT(*) INTO v_count FROM public.global_taxonomy;
  RAISE NOTICE 'global_taxonomy: % registros', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.documents;
  RAISE NOTICE 'documents: % registros', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.document_chunks;
  RAISE NOTICE 'document_chunks: % registros', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.chat_agents WHERE is_active = true;
  RAISE NOTICE 'chat_agents (ativos): % registros', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.economic_indicators;
  RAISE NOTICE 'economic_indicators: % registros', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.indicator_values;
  RAISE NOTICE 'indicator_values: % registros', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.entity_tags;
  RAISE NOTICE 'entity_tags: % registros', v_count;
  
  -- Verificar integridade de foreign keys
  SELECT COUNT(*) INTO v_count 
  FROM public.entity_tags et 
  LEFT JOIN public.global_taxonomy gt ON et.taxonomy_id = gt.id 
  WHERE gt.id IS NULL;
  
  IF v_count > 0 THEN
    RAISE WARNING 'entity_tags com taxonomy_id órfão: %', v_count;
  ELSE
    RAISE NOTICE 'entity_tags: integridade OK';
  END IF;
  
  SELECT COUNT(*) INTO v_count 
  FROM public.document_chunks dc 
  LEFT JOIN public.documents d ON dc.document_id = d.id 
  WHERE d.id IS NULL;
  
  IF v_count > 0 THEN
    RAISE WARNING 'document_chunks com document_id órfão: %', v_count;
  ELSE
    RAISE NOTICE 'document_chunks: integridade OK';
  END IF;
  
  RAISE NOTICE '=== VALIDAÇÃO CONCLUÍDA ===';
END $$;

-- ============================================================
-- COMANDOS ÚTEIS PARA LIMPEZA ANTES DA MIGRAÇÃO
-- ============================================================

-- Se precisar limpar o banco destino antes de importar:

/*
-- CUIDADO: Isso apaga TODOS os dados!
TRUNCATE TABLE 
  public.entity_tags,
  public.document_chunks,
  public.document_tags,
  public.document_versions,
  public.documents,
  public.indicator_values,
  public.indicator_regional_values,
  public.conversation_history,
  public.pwa_conversation_messages,
  public.pwa_conversation_sessions,
  public.notification_logs
CASCADE;
*/
