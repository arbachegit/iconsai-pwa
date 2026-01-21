-- ============================================
-- FIX: Corrigir função de mapeamento e remigrar dados
-- ============================================

-- 1. Atualizar função get_module_type_from_slug com mais padrões
CREATE OR REPLACE FUNCTION get_module_type_from_slug(slug TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN slug IS NULL OR slug = '' THEN 'world'
    -- HEALTH patterns
    WHEN slug ILIKE '%health%' 
         OR slug ILIKE '%saude%' 
         OR slug ILIKE '%saúde%' 
         OR slug ILIKE '%medic%' 
         OR slug ILIKE '%hospital%' 
         OR slug ILIKE '%hmv%' THEN 'health'
    -- IDEAS patterns  
    WHEN slug ILIKE '%idea%' 
         OR slug ILIKE '%ideia%' 
         OR slug ILIKE '%ideias%'
         OR slug ILIKE '%inovacao%' 
         OR slug ILIKE '%inovação%' THEN 'ideas'
    -- WORLD patterns
    WHEN slug ILIKE '%economia%' 
         OR slug ILIKE '%world%' 
         OR slug ILIKE '%eco%' THEN 'world'
    ELSE 'world'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_module_type_from_slug IS 'Converte agent_slug para module_type (world, health, ideas) - v2 com mais padrões';

-- 2. Atualizar module_type das sessões existentes que estão como 'world' mas deveriam ser 'health' ou 'ideas'
UPDATE pwa_conversation_sessions cs
SET module_type = (
  SELECT DISTINCT get_module_type_from_slug(m.agent_slug)
  FROM pwa_messages m
  WHERE m.session_id = cs.id
  AND get_module_type_from_slug(m.agent_slug) != 'world'
  LIMIT 1
)
WHERE module_type = 'world'
  AND EXISTS (
    SELECT 1 FROM pwa_messages m 
    WHERE m.session_id = cs.id 
    AND get_module_type_from_slug(m.agent_slug) IN ('health', 'ideas')
  );

-- 3. Remigrar sessões que ainda não existem
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
WHERE NOT EXISTS (SELECT 1 FROM pwa_conversation_sessions cs WHERE cs.id = s.id)
ON CONFLICT (id) DO NOTHING;

-- 4. Remigrar mensagens faltantes
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
  AND NOT EXISTS (SELECT 1 FROM pwa_conversation_messages cm WHERE cm.id = m.id)
ON CONFLICT (id) DO NOTHING;

-- 5. Estatísticas
DO $$
DECLARE
  v_world_count INTEGER;
  v_health_count INTEGER;
  v_ideas_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_world_count FROM pwa_conversation_sessions WHERE module_type = 'world';
  SELECT COUNT(*) INTO v_health_count FROM pwa_conversation_sessions WHERE module_type = 'health';
  SELECT COUNT(*) INTO v_ideas_count FROM pwa_conversation_sessions WHERE module_type = 'ideas';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '=== CORREÇÃO DE MIGRAÇÃO CONCLUÍDA ===';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sessões World: %', v_world_count;
  RAISE NOTICE 'Sessões Health: %', v_health_count;
  RAISE NOTICE 'Sessões Ideas: %', v_ideas_count;
  RAISE NOTICE '========================================';
END $$;