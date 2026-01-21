
-- ============================================
-- MIGRATION: Migrar dados PWA para novas tabelas
-- Idempotente: pode rodar múltiplas vezes
-- ============================================

-- 1. Criar função helper para mapear agent_slug → module_type
CREATE OR REPLACE FUNCTION get_module_type_from_slug(slug TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN slug IS NULL THEN 'world'
    WHEN slug ILIKE '%economia%' OR slug ILIKE '%world%' THEN 'world'
    WHEN slug ILIKE '%health%' OR slug ILIKE '%saude%' OR slug ILIKE '%saúde%' THEN 'health'
    WHEN slug ILIKE '%idea%' THEN 'ideas'
    ELSE 'world'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_module_type_from_slug IS 'Converte agent_slug para module_type (world, health, ideas)';

-- 2. Migrar pwa_sessions → pwa_conversation_sessions
INSERT INTO pwa_conversation_sessions (
  id, device_id, user_name, user_email, company, company_source,
  module_type, started_at, ended_at, city, country, latitude, longitude, created_at
)
SELECT 
  s.id,
  s.device_id,
  COALESCE(s.user_name, d.user_name),
  d.user_email,
  NULL::TEXT,
  'undefined'::TEXT,
  COALESCE(get_module_type_from_slug(
    (SELECT m.agent_slug FROM pwa_messages m WHERE m.session_id = s.id ORDER BY m.created_at ASC LIMIT 1)
  ), 'world')::TEXT,
  s.created_at,
  s.last_interaction,
  d.ip_city,
  d.ip_country,
  d.latitude,
  d.longitude,
  s.created_at
FROM pwa_sessions s
LEFT JOIN pwa_devices d ON s.device_id = d.device_fingerprint
ON CONFLICT (id) DO NOTHING;

-- 3. Migrar pwa_messages → pwa_conversation_messages
INSERT INTO pwa_conversation_messages (
  id, session_id, role, content, audio_url, audio_duration_seconds,
  transcription, timestamp, taxonomy_tags, key_topics, created_at
)
SELECT 
  m.id,
  m.session_id,
  m.role,
  m.content,
  m.audio_url,
  NULL::NUMERIC,
  NULL::TEXT,
  m.created_at,
  '{}'::text[],
  '{"people": [], "countries": [], "organizations": []}'::jsonb,
  m.created_at
FROM pwa_messages m
WHERE EXISTS (SELECT 1 FROM pwa_conversation_sessions cs WHERE cs.id = m.session_id)
ON CONFLICT (id) DO NOTHING;

-- 4. Migrar pwa_conversation_summaries → pwa_conv_summaries
INSERT INTO pwa_conv_summaries (
  id, session_id, summary_text, summary_audio_url, 
  taxonomy_tags, key_topics, generated_at
)
SELECT 
  cs.id,
  (SELECT s.id FROM pwa_conversation_sessions s 
   WHERE s.device_id = cs.device_id AND s.module_type = cs.module_type 
   ORDER BY s.started_at DESC LIMIT 1),
  cs.summary,
  NULL::TEXT,
  '{}'::text[],
  jsonb_build_object(
    'people', '[]'::jsonb,
    'countries', '[]'::jsonb,
    'organizations', '[]'::jsonb,
    'last_user_message', COALESCE(cs.last_user_message, ''),
    'last_assistant_message', COALESCE(cs.last_assistant_message, '')
  ),
  COALESCE(cs.updated_at, NOW())
FROM pwa_conversation_summaries cs
WHERE EXISTS (
  SELECT 1 FROM pwa_conversation_sessions s 
  WHERE s.device_id = cs.device_id AND s.module_type = cs.module_type
)
ON CONFLICT (id) DO NOTHING;

-- 5. Estatísticas da migração
DO $$
DECLARE
  v_sessions_migrated INTEGER;
  v_messages_migrated INTEGER;
  v_summaries_migrated INTEGER;
  v_sessions_original INTEGER;
  v_messages_original INTEGER;
  v_summaries_original INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_sessions_original FROM pwa_sessions;
  SELECT COUNT(*) INTO v_messages_original FROM pwa_messages;
  SELECT COUNT(*) INTO v_summaries_original FROM pwa_conversation_summaries;
  
  SELECT COUNT(*) INTO v_sessions_migrated FROM pwa_conversation_sessions;
  SELECT COUNT(*) INTO v_messages_migrated FROM pwa_conversation_messages;
  SELECT COUNT(*) INTO v_summaries_migrated FROM pwa_conv_summaries;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '=== MIGRAÇÃO PWA CONCLUÍDA ===';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sessões: % originais → % migradas', v_sessions_original, v_sessions_migrated;
  RAISE NOTICE 'Mensagens: % originais → % migradas', v_messages_original, v_messages_migrated;
  RAISE NOTICE 'Resumos: % originais → % migrados', v_summaries_original, v_summaries_migrated;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tabelas antigas preservadas (backup)';
  RAISE NOTICE '========================================';
END $$;
