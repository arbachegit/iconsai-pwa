-- FASE 1: Configuração dos Agentes com Taxonomia

-- =====================================================
-- PARTE 1: Atualizar Agent Tag Profiles
-- =====================================================

-- 1. Agente 'study': adicionar tecnologia e ideias
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children)
SELECT 
  (SELECT id FROM chat_agents WHERE slug = 'study'),
  id, 'include', true
FROM global_taxonomy 
WHERE code IN ('tecnologia', 'ideias')
  AND (SELECT id FROM chat_agents WHERE slug = 'study') IS NOT NULL
ON CONFLICT (agent_id, taxonomy_id) DO NOTHING;

-- 2. Agente 'ideias': adicionar tecnologia.ia
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children)
SELECT 
  (SELECT id FROM chat_agents WHERE slug = 'ideias'),
  id, 'include', true
FROM global_taxonomy 
WHERE code = 'tecnologia.ia'
  AND (SELECT id FROM chat_agents WHERE slug = 'ideias') IS NOT NULL
ON CONFLICT (agent_id, taxonomy_id) DO NOTHING;

-- 3. Agente 'company': garantir conhecimento pai
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children)
SELECT 
  (SELECT id FROM chat_agents WHERE slug = 'company'),
  id, 'include', true
FROM global_taxonomy 
WHERE code = 'conhecimento'
  AND (SELECT id FROM chat_agents WHERE slug = 'company') IS NOT NULL
ON CONFLICT (agent_id, taxonomy_id) DO NOTHING;

-- =====================================================
-- PARTE 2: Funções SQL de Cobertura
-- =====================================================

-- Função: get_agent_taxonomy_codes(slug)
-- Retorna array de códigos de taxonomia para um agente
CREATE OR REPLACE FUNCTION public.get_agent_taxonomy_codes(agent_slug TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT gt.code)
  INTO result
  FROM agent_tag_profiles atp
  JOIN chat_agents ca ON ca.id = atp.agent_id
  JOIN global_taxonomy gt ON gt.id = atp.taxonomy_id
  WHERE ca.slug = agent_slug
    AND ca.is_active = true
    AND atp.access_type = 'include';
  
  RETURN COALESCE(result, ARRAY[]::TEXT[]);
END;
$$;

-- Função: get_agent_excluded_taxonomy_codes(slug)
-- Retorna array de códigos de taxonomia excluídos para um agente
CREATE OR REPLACE FUNCTION public.get_agent_excluded_taxonomy_codes(agent_slug TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT gt.code)
  INTO result
  FROM agent_tag_profiles atp
  JOIN chat_agents ca ON ca.id = atp.agent_id
  JOIN global_taxonomy gt ON gt.id = atp.taxonomy_id
  WHERE ca.slug = agent_slug
    AND ca.is_active = true
    AND atp.access_type = 'exclude';
  
  RETURN COALESCE(result, ARRAY[]::TEXT[]);
END;
$$;

-- Função: count_agent_accessible_documents(slug)
-- Conta documentos acessíveis por taxonomia para um agente
CREATE OR REPLACE FUNCTION public.count_agent_accessible_documents(agent_slug TEXT)
RETURNS TABLE(
  taxonomy_code TEXT,
  taxonomy_name TEXT,
  document_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gt.code as taxonomy_code,
    gt.name as taxonomy_name,
    COUNT(DISTINCT et.entity_id) as document_count
  FROM agent_tag_profiles atp
  JOIN chat_agents ca ON ca.id = atp.agent_id
  JOIN global_taxonomy gt ON gt.id = atp.taxonomy_id
  LEFT JOIN entity_tags et ON et.taxonomy_id = gt.id AND et.entity_type = 'document'
  WHERE ca.slug = agent_slug
    AND ca.is_active = true
    AND atp.access_type = 'include'
  GROUP BY gt.code, gt.name
  ORDER BY document_count DESC;
END;
$$;

-- Função: check_all_agents_coverage()
-- Verifica cobertura de todos os agentes ativos
CREATE OR REPLACE FUNCTION public.check_all_agents_coverage()
RETURNS TABLE(
  agent_slug TEXT,
  agent_name TEXT,
  taxonomy_codes TEXT[],
  total_documents BIGINT,
  coverage_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.slug as agent_slug,
    ca.name as agent_name,
    COALESCE(ARRAY_AGG(DISTINCT gt.code) FILTER (WHERE gt.code IS NOT NULL), ARRAY[]::TEXT[]) as taxonomy_codes,
    COUNT(DISTINCT et.entity_id) as total_documents,
    CASE 
      WHEN COUNT(DISTINCT et.entity_id) = 0 THEN 'SEM DOCUMENTOS'
      WHEN COUNT(DISTINCT et.entity_id) < 5 THEN 'BAIXA COBERTURA'
      WHEN COUNT(DISTINCT et.entity_id) < 20 THEN 'COBERTURA MODERADA'
      ELSE 'BOA COBERTURA'
    END as coverage_status
  FROM chat_agents ca
  LEFT JOIN agent_tag_profiles atp ON atp.agent_id = ca.id AND atp.access_type = 'include'
  LEFT JOIN global_taxonomy gt ON gt.id = atp.taxonomy_id
  LEFT JOIN entity_tags et ON et.taxonomy_id = gt.id AND et.entity_type = 'document'
  WHERE ca.is_active = true
  GROUP BY ca.slug, ca.name
  ORDER BY total_documents DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_agent_taxonomy_codes(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_agent_excluded_taxonomy_codes(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_agent_accessible_documents(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_all_agents_coverage() TO anon, authenticated, service_role;