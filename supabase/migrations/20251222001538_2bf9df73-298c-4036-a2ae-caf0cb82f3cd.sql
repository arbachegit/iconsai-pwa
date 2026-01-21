
-- =============================================
-- MIGRAÇÃO COMPLETA: document_tags → entity_tags
-- Inclui categoria 'tecnologia' e subcategorias
-- =============================================

-- =============================================
-- PASSO 1: EXPANDIR TAXONOMIA GLOBAL
-- =============================================

-- Adicionar "tecnologia" como categoria raiz
INSERT INTO global_taxonomy (code, name, level, keywords, synonyms, description, icon, color)
SELECT 
  'tecnologia', 
  'Tecnologia',
  1,
  ARRAY['tecnologia', 'tech', 'digital', 'software', 'hardware'],
  ARRAY['technology', 'tech'],
  'Temas de tecnologia e inovação digital',
  '💻',
  '#8B5CF6'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'tecnologia' AND level = 1);

-- Subcategorias de tecnologia
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'tecnologia.ia', 
  'Inteligência Artificial',
  (SELECT id FROM global_taxonomy WHERE code = 'tecnologia' AND level = 1),
  2,
  ARRAY['ia', 'inteligência artificial', 'machine learning', 'ml', 'deep learning', 'ai generativa', 'llm', 'gpt'],
  ARRAY['ai', 'artificial intelligence', 'ml', 'deep learning'],
  'Inteligência Artificial e Machine Learning'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'tecnologia.ia');

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'tecnologia.automacao', 
  'Automação',
  (SELECT id FROM global_taxonomy WHERE code = 'tecnologia' AND level = 1),
  2,
  ARRAY['automação', 'automatização', 'rpa', 'bot', 'workflow'],
  ARRAY['automation', 'rpa'],
  'Automação de processos'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'tecnologia.automacao');

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'tecnologia.dados', 
  'Dados',
  (SELECT id FROM global_taxonomy WHERE code = 'tecnologia' AND level = 1),
  2,
  ARRAY['dados', 'data', 'analytics', 'bi', 'big data'],
  ARRAY['data', 'analytics', 'big data'],
  'Ciência de dados e analytics'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'tecnologia.dados');

-- Expandir "ideias" com subcategorias
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'ideias.inovacao', 
  'Inovação',
  (SELECT id FROM global_taxonomy WHERE code = 'ideias'),
  2,
  ARRAY['inovação', 'novo', 'disruptivo', 'transformação'],
  ARRAY['innovation', 'disruptive'],
  'Projetos e iniciativas de inovação'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'ideias.inovacao');

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'ideias.projetos', 
  'Projetos',
  (SELECT id FROM global_taxonomy WHERE code = 'ideias'),
  2,
  ARRAY['projeto', 'iniciativa', 'desenvolvimento'],
  ARRAY['project', 'initiative'],
  'Projetos em desenvolvimento'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'ideias.projetos');

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'ideias.pesquisa', 
  'Pesquisa',
  (SELECT id FROM global_taxonomy WHERE code = 'ideias'),
  2,
  ARRAY['pesquisa', 'estudo', 'investigação', 'análise'],
  ARRAY['research', 'study'],
  'Pesquisas e estudos'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'ideias.pesquisa');

-- Expandir "economia.setores" 
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'economia.setores.varejo', 
  'Varejo',
  (SELECT id FROM global_taxonomy WHERE code = 'economia.setores'),
  3,
  ARRAY['varejo', 'comércio', 'loja', 'vendas', 'pmc'],
  ARRAY['retail', 'commerce', 'sales'],
  'Setor de varejo e comércio'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'economia.setores.varejo');

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'economia.setores.industria', 
  'Indústria',
  (SELECT id FROM global_taxonomy WHERE code = 'economia.setores'),
  3,
  ARRAY['indústria', 'manufatura', 'produção', 'pim', 'fábrica'],
  ARRAY['industry', 'manufacturing'],
  'Setor industrial e manufatura'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'economia.setores.industria');

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'economia.setores.servicos', 
  'Serviços',
  (SELECT id FROM global_taxonomy WHERE code = 'economia.setores'),
  3,
  ARRAY['serviços', 'pms', 'terciário'],
  ARRAY['services'],
  'Setor de serviços'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'economia.setores.servicos');

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms, description)
SELECT 
  'economia.setores.agro', 
  'Agronegócio',
  (SELECT id FROM global_taxonomy WHERE code = 'economia.setores'),
  3,
  ARRAY['agro', 'agronegócio', 'agricultura', 'pecuária', 'commodities'],
  ARRAY['agribusiness', 'agriculture'],
  'Setor agropecuário'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'economia.setores.agro');

-- Adicionar "regional" como categoria raiz
INSERT INTO global_taxonomy (code, name, level, keywords, synonyms, description, icon, color)
SELECT 
  'regional', 
  'Regional',
  1,
  ARRAY['região', 'estado', 'uf', 'município', 'cidade', 'local'],
  ARRAY['region', 'state', 'city'],
  'Dados e análises regionais',
  '🗺️',
  '#0EA5E9'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'regional' AND level = 1);

-- Subcategorias regionais
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms)
SELECT 
  'regional.brasil', 
  'Brasil',
  (SELECT id FROM global_taxonomy WHERE code = 'regional' AND level = 1),
  2,
  ARRAY['brasil', 'nacional', 'país'],
  ARRAY['brazil', 'national']
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'regional.brasil');

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms)
SELECT 
  'regional.estados', 
  'Estados',
  (SELECT id FROM global_taxonomy WHERE code = 'regional' AND level = 1),
  2,
  ARRAY['estado', 'uf', 'estadual'],
  ARRAY['state']
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'regional.estados');

-- Adicionar "documentos" como categoria raiz
INSERT INTO global_taxonomy (code, name, level, keywords, synonyms, description, icon, color)
SELECT 
  'documentos', 
  'Documentos',
  1,
  ARRAY['documento', 'arquivo', 'relatório', 'análise'],
  ARRAY['document', 'file', 'report'],
  'Tipos de documentos',
  '📄',
  '#64748B'
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'documentos' AND level = 1);

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms)
SELECT 
  'documentos.relatorios', 
  'Relatórios',
  (SELECT id FROM global_taxonomy WHERE code = 'documentos' AND level = 1),
  2,
  ARRAY['relatório', 'report', 'análise', 'relatórios anuais'],
  ARRAY['report', 'analysis', 'annual report']
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'documentos.relatorios');

INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms)
SELECT 
  'documentos.estudos', 
  'Estudos',
  (SELECT id FROM global_taxonomy WHERE code = 'documentos' AND level = 1),
  2,
  ARRAY['estudo', 'pesquisa', 'paper'],
  ARRAY['study', 'research', 'paper']
WHERE NOT EXISTS (SELECT 1 FROM global_taxonomy WHERE code = 'documentos.estudos');

-- =============================================
-- PASSO 2: LIMPAR entity_tags DE DOCUMENTOS
-- =============================================

DELETE FROM entity_tags WHERE entity_type = 'document';

-- =============================================
-- PASSO 3: POPULAR entity_tags COM MAPEAMENTO INTELIGENTE
-- Usando source='ai_auto' que é um valor válido
-- =============================================

-- Mapeamento por código exato
INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, confidence, source)
SELECT DISTINCT ON (dt.document_id, gt.id)
  'document',
  dt.document_id,
  gt.id,
  COALESCE(dt.confidence, 0.95),
  'ai_auto'
FROM document_tags dt
JOIN global_taxonomy gt ON LOWER(gt.code) = LOWER(TRIM(dt.tag_name))
ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;

-- Mapeamento por keyword
INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, confidence, source)
SELECT DISTINCT ON (dt.document_id, gt.id)
  'document',
  dt.document_id,
  gt.id,
  COALESCE(dt.confidence, 0.85),
  'ai_auto'
FROM document_tags dt
CROSS JOIN global_taxonomy gt
WHERE LOWER(TRIM(dt.tag_name)) = ANY(gt.keywords)
  AND NOT EXISTS (
    SELECT 1 FROM entity_tags et 
    WHERE et.entity_id = dt.document_id 
      AND et.taxonomy_id = gt.id
      AND et.entity_type = 'document'
  )
ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;

-- Mapeamento por sinônimo
INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, confidence, source)
SELECT DISTINCT ON (dt.document_id, gt.id)
  'document',
  dt.document_id,
  gt.id,
  COALESCE(dt.confidence, 0.75),
  'ai_auto'
FROM document_tags dt
CROSS JOIN global_taxonomy gt
WHERE LOWER(TRIM(dt.tag_name)) = ANY(gt.synonyms)
  AND NOT EXISTS (
    SELECT 1 FROM entity_tags et 
    WHERE et.entity_id = dt.document_id 
      AND et.taxonomy_id = gt.id
      AND et.entity_type = 'document'
  )
ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;

-- Mapeamento por nome da taxonomia (case insensitive)
INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, confidence, source)
SELECT DISTINCT ON (dt.document_id, gt.id)
  'document',
  dt.document_id,
  gt.id,
  COALESCE(dt.confidence, 0.80),
  'ai_auto'
FROM document_tags dt
JOIN global_taxonomy gt ON LOWER(gt.name) = LOWER(TRIM(dt.tag_name))
WHERE NOT EXISTS (
  SELECT 1 FROM entity_tags et 
  WHERE et.entity_id = dt.document_id 
    AND et.taxonomy_id = gt.id
    AND et.entity_type = 'document'
)
ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;

-- Mapeamento parcial por substring (última parte do código)
INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, confidence, source)
SELECT DISTINCT ON (dt.document_id, gt.id)
  'document',
  dt.document_id,
  gt.id,
  COALESCE(dt.confidence, 0.60),
  'ai_suggested'
FROM document_tags dt
CROSS JOIN global_taxonomy gt
WHERE (
  LOWER(TRIM(dt.tag_name)) LIKE '%' || LOWER(SPLIT_PART(gt.code, '.', array_length(string_to_array(gt.code, '.'), 1))) || '%'
  OR LOWER(SPLIT_PART(gt.code, '.', array_length(string_to_array(gt.code, '.'), 1))) LIKE '%' || LOWER(TRIM(dt.tag_name)) || '%'
)
  AND LENGTH(TRIM(dt.tag_name)) >= 3
  AND NOT EXISTS (
    SELECT 1 FROM entity_tags et 
    WHERE et.entity_id = dt.document_id 
      AND et.taxonomy_id = gt.id
      AND et.entity_type = 'document'
  )
ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;

-- Mapear documentos sem taxonomia para _pendente.classificacao
INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, confidence, source)
SELECT DISTINCT
  'document',
  d.id,
  (SELECT id FROM global_taxonomy WHERE code = '_pendente.classificacao'),
  0.1,
  'ai_suggested'
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM entity_tags et 
  WHERE et.entity_id = d.id 
    AND et.entity_type = 'document'
)
  AND EXISTS (SELECT 1 FROM global_taxonomy WHERE code = '_pendente.classificacao')
ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;
