-- =============================================
-- Popular agent_tag_profiles com mapeamento inicial
-- Cada agente recebe acesso às tags relevantes da taxonomia global
-- =============================================

-- Limpar dados anteriores (se existirem)
DELETE FROM agent_tag_profiles;

-- AGENTE: economia (IA PWA Economista)
-- Acesso: economia.* (todas as subtags de economia)
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children, weight)
SELECT 
  a.id,
  gt.id,
  'include',
  true,
  1.0
FROM chat_agents a
CROSS JOIN global_taxonomy gt
WHERE a.slug = 'economia'
  AND gt.code = 'economia'
  AND a.is_active = true;

-- AGENTE: health (IA PWA Saúde)
-- Acesso: saude.* 
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children, weight)
SELECT 
  a.id,
  gt.id,
  'include',
  true,
  1.0
FROM chat_agents a
CROSS JOIN global_taxonomy gt
WHERE a.slug = 'health'
  AND gt.code = 'saude'
  AND a.is_active = true;

-- AGENTE: study (IA Front)
-- Acesso: conhecimento.* (knowyou, knowrisk, acc)
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children, weight)
SELECT 
  a.id,
  gt.id,
  'include',
  true,
  1.0
FROM chat_agents a
CROSS JOIN global_taxonomy gt
WHERE a.slug = 'study'
  AND gt.code = 'conhecimento'
  AND a.is_active = true;

-- AGENTE: analyst (IA Float Dashboard)
-- Acesso: economia.indicadores.* + economia.mercados.* + economia.setores.*
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children, weight)
SELECT 
  a.id,
  gt.id,
  'include',
  true,
  1.0
FROM chat_agents a
CROSS JOIN global_taxonomy gt
WHERE a.slug = 'analyst'
  AND gt.code IN ('economia.indicadores', 'economia.mercados', 'economia.setores')
  AND a.is_active = true;

-- AGENTE: analyst_user (IA APP User)
-- Acesso: economia.indicadores.* (mais restrito)
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children, weight)
SELECT 
  a.id,
  gt.id,
  'include',
  true,
  1.0
FROM chat_agents a
CROSS JOIN global_taxonomy gt
WHERE a.slug = 'analyst_user'
  AND gt.code = 'economia.indicadores'
  AND a.is_active = true;

-- AGENTE: analyst_admin (IA Dashboard Admin)
-- Acesso: economia.* completo
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children, weight)
SELECT 
  a.id,
  gt.id,
  'include',
  true,
  1.0
FROM chat_agents a
CROSS JOIN global_taxonomy gt
WHERE a.slug = 'analyst_admin'
  AND gt.code = 'economia'
  AND a.is_active = true;

-- AGENTE: company (IA Float Front/Landing)
-- Acesso: conhecimento.knowyou.* + conhecimento.knowrisk.*
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children, weight)
SELECT 
  a.id,
  gt.id,
  'include',
  true,
  1.0
FROM chat_agents a
CROSS JOIN global_taxonomy gt
WHERE a.slug = 'company'
  AND gt.code IN ('conhecimento.knowyou', 'conhecimento.knowrisk')
  AND a.is_active = true;

-- AGENTE: ideias (IA PWA Ideias)
-- Acesso: ideias.*
INSERT INTO agent_tag_profiles (agent_id, taxonomy_id, access_type, include_children, weight)
SELECT 
  a.id,
  gt.id,
  'include',
  true,
  1.0
FROM chat_agents a
CROSS JOIN global_taxonomy gt
WHERE a.slug = 'ideias'
  AND gt.code = 'ideias'
  AND a.is_active = true;