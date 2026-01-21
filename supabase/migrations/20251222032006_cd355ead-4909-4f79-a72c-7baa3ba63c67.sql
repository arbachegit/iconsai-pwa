-- ================================================================
-- FASE 5: AUTO-GESTÃO DE TAXONOMIAS
-- Tabela taxonomy_suggestions + Funções de workflow
-- ================================================================

-- 1. Criar tabela de sugestões de taxonomias
CREATE TABLE IF NOT EXISTS public.taxonomy_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados sugeridos
  suggested_code TEXT NOT NULL,
  suggested_name TEXT NOT NULL,
  suggested_description TEXT,
  suggested_parent_id UUID REFERENCES global_taxonomy(id) ON DELETE SET NULL,
  suggested_parent_code TEXT,
  suggested_keywords TEXT[] DEFAULT '{}',
  suggested_synonyms TEXT[] DEFAULT '{}',
  suggested_icon TEXT,
  suggested_color TEXT,
  
  -- Metadados da sugestão
  source TEXT CHECK (source IN ('ai_analysis', 'keyword_frequency', 'user_request', 'ml_pattern', 'gap_detection')) DEFAULT 'ai_analysis',
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  based_on_documents UUID[] DEFAULT '{}',
  based_on_keywords TEXT[] DEFAULT '{}',
  occurrence_count INTEGER DEFAULT 1,
  sample_contexts TEXT[] DEFAULT '{}',
  
  -- Status e workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  
  -- Se aprovada, link para taxonomia criada
  created_taxonomy_id UUID REFERENCES global_taxonomy(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_taxonomy_suggestions_status ON taxonomy_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_taxonomy_suggestions_source ON taxonomy_suggestions(source);
CREATE INDEX IF NOT EXISTS idx_taxonomy_suggestions_confidence ON taxonomy_suggestions(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_taxonomy_suggestions_created_at ON taxonomy_suggestions(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_taxonomy_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_taxonomy_suggestions_timestamp ON taxonomy_suggestions;
CREATE TRIGGER trigger_update_taxonomy_suggestions_timestamp
  BEFORE UPDATE ON taxonomy_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_taxonomy_suggestions_updated_at();

-- RLS
ALTER TABLE taxonomy_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read taxonomy_suggestions for authenticated"
  ON taxonomy_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert taxonomy_suggestions for authenticated"
  ON taxonomy_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update taxonomy_suggestions for authenticated"
  ON taxonomy_suggestions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete taxonomy_suggestions for authenticated"
  ON taxonomy_suggestions FOR DELETE
  TO authenticated
  USING (true);

-- ================================================================
-- 2. Função: Detectar Gaps na Taxonomia
-- ================================================================
CREATE OR REPLACE FUNCTION detect_taxonomy_gaps()
RETURNS TABLE (
  gap_type TEXT,
  description TEXT,
  severity TEXT,
  document_count INTEGER,
  sample_documents JSONB,
  suggested_action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  
  -- Gap 1: Documentos sem nenhuma taxonomia
  SELECT 
    'no_taxonomy'::TEXT as gap_type,
    'Documentos sem nenhuma taxonomia associada'::TEXT as description,
    'high'::TEXT as severity,
    COUNT(DISTINCT d.id)::INTEGER as document_count,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object('id', d.id, 'filename', d.filename)) 
      FILTER (WHERE d.id IS NOT NULL),
      '[]'::jsonb
    ) as sample_documents,
    'Re-classificar estes documentos'::TEXT as suggested_action
  FROM documents d
  LEFT JOIN entity_tags et ON et.entity_id = d.id AND et.entity_type = 'document'
  WHERE d.status = 'completed'
    AND et.id IS NULL
  HAVING COUNT(DISTINCT d.id) > 0
  
  UNION ALL
  
  -- Gap 2: Documentos com classificação pendente
  SELECT 
    'pending_classification'::TEXT,
    'Documentos com tag _pendente.classificacao'::TEXT,
    'medium'::TEXT,
    COUNT(DISTINCT et.entity_id)::INTEGER,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object('id', d.id, 'filename', d.filename)) 
      FILTER (WHERE d.id IS NOT NULL),
      '[]'::jsonb
    ),
    'Revisar manualmente e classificar'::TEXT
  FROM entity_tags et
  JOIN global_taxonomy gt ON gt.id = et.taxonomy_id
  JOIN documents d ON d.id = et.entity_id
  WHERE gt.code LIKE '%_pendente%'
    AND et.entity_type = 'document'
  HAVING COUNT(DISTINCT et.entity_id) > 0
  
  UNION ALL
  
  -- Gap 3: Taxonomias órfãs (sem documentos)
  SELECT 
    'orphan_taxonomy'::TEXT,
    'Taxonomias sem nenhum documento associado'::TEXT,
    'low'::TEXT,
    COUNT(DISTINCT gt.id)::INTEGER,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object('id', gt.id, 'code', gt.code, 'name', gt.name)),
      '[]'::jsonb
    ),
    'Considerar deprecar ou remover'::TEXT
  FROM global_taxonomy gt
  LEFT JOIN entity_tags et ON et.taxonomy_id = gt.id
  WHERE et.id IS NULL
    AND gt.status = 'active'
  HAVING COUNT(DISTINCT gt.id) > 0
  
  UNION ALL
  
  -- Gap 4: Classificações com baixa confiança
  SELECT 
    'low_confidence'::TEXT,
    'Documentos com classificação de baixa confiança (<70%)'::TEXT,
    'medium'::TEXT,
    COUNT(DISTINCT et.entity_id)::INTEGER,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object(
        'id', d.id, 
        'filename', d.filename,
        'confidence', et.confidence
      )) FILTER (WHERE d.id IS NOT NULL),
      '[]'::jsonb
    ),
    'Revisar e criar taxonomias mais específicas'::TEXT
  FROM entity_tags et
  JOIN documents d ON d.id = et.entity_id
  WHERE et.confidence < 0.7
    AND et.entity_type = 'document'
  HAVING COUNT(DISTINCT et.entity_id) > 0;
  
END;
$$;

-- ================================================================
-- 3. Função: Estatísticas de Saúde da Taxonomia
-- ================================================================
CREATE OR REPLACE FUNCTION get_taxonomy_health_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  total_taxonomies INTEGER;
  approved_count INTEGER;
  pending_count INTEGER;
  deprecated_count INTEGER;
  auto_created_count INTEGER;
  total_docs INTEGER;
  docs_with_taxonomy INTEGER;
  orphan_count INTEGER;
  pending_suggestions INTEGER;
  gaps_detected INTEGER;
  health_score INTEGER;
BEGIN
  -- Contagens de taxonomias
  SELECT COUNT(*) INTO total_taxonomies FROM global_taxonomy WHERE status = 'active';
  SELECT COUNT(*) INTO approved_count FROM global_taxonomy WHERE status = 'active';
  SELECT COUNT(*) INTO pending_count FROM global_taxonomy WHERE status = 'pending';
  SELECT COUNT(*) INTO deprecated_count FROM global_taxonomy WHERE status = 'deprecated';
  SELECT COUNT(*) INTO auto_created_count FROM global_taxonomy WHERE auto_created = true;
  
  -- Contagens de documentos
  SELECT COUNT(*) INTO total_docs FROM documents WHERE status = 'completed';
  SELECT COUNT(DISTINCT entity_id) INTO docs_with_taxonomy 
  FROM entity_tags WHERE entity_type = 'document';
  
  -- Taxonomias órfãs
  SELECT COUNT(*) INTO orphan_count
  FROM global_taxonomy gt
  LEFT JOIN entity_tags et ON et.taxonomy_id = gt.id
  WHERE et.id IS NULL AND gt.status = 'active';
  
  -- Sugestões pendentes
  SELECT COUNT(*) INTO pending_suggestions 
  FROM taxonomy_suggestions WHERE status = 'pending';
  
  -- Gaps detectados
  SELECT COUNT(*) INTO gaps_detected
  FROM detect_taxonomy_gaps();
  
  -- Calcular score de saúde (0-100)
  -- Fatores: % docs classificados, % taxonomias usadas, poucos pendentes
  health_score := GREATEST(0, LEAST(100,
    CASE WHEN total_docs = 0 THEN 50
    ELSE (docs_with_taxonomy::FLOAT / total_docs * 40)::INTEGER END
    +
    CASE WHEN total_taxonomies = 0 THEN 30
    ELSE ((total_taxonomies - orphan_count)::FLOAT / total_taxonomies * 30)::INTEGER END
    +
    CASE WHEN pending_suggestions = 0 THEN 30
    ELSE GREATEST(0, 30 - pending_suggestions * 3) END
  ));
  
  result := jsonb_build_object(
    'total_taxonomies', total_taxonomies,
    'approved_count', approved_count,
    'pending_count', pending_count,
    'deprecated_count', deprecated_count,
    'auto_created_count', auto_created_count,
    'total_documents', total_docs,
    'documents_with_taxonomy', docs_with_taxonomy,
    'documents_without_taxonomy', total_docs - docs_with_taxonomy,
    'orphan_taxonomies', orphan_count,
    'pending_suggestions', pending_suggestions,
    'gaps_detected', gaps_detected,
    'health_score', health_score,
    'coverage_percentage', CASE WHEN total_docs = 0 THEN 0 
      ELSE ROUND((docs_with_taxonomy::FLOAT / total_docs * 100)::NUMERIC, 1) END
  );
  
  RETURN result;
END;
$$;

-- ================================================================
-- 4. Função: Criar Sugestão de Taxonomia
-- ================================================================
CREATE OR REPLACE FUNCTION create_taxonomy_suggestion(
  p_code TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_keywords TEXT[] DEFAULT '{}',
  p_source TEXT DEFAULT 'ai_analysis',
  p_related_docs UUID[] DEFAULT '{}',
  p_confidence FLOAT DEFAULT 0.5,
  p_sample_contexts TEXT[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion_id UUID;
  v_parent_code TEXT;
  v_existing_id UUID;
BEGIN
  -- Verificar se já existe sugestão similar pendente
  SELECT id INTO v_existing_id
  FROM taxonomy_suggestions
  WHERE LOWER(suggested_code) = LOWER(p_code)
    AND status = 'pending';
  
  IF v_existing_id IS NOT NULL THEN
    -- Atualizar sugestão existente
    UPDATE taxonomy_suggestions SET
      occurrence_count = occurrence_count + 1,
      confidence = LEAST(0.95, confidence + 0.05),
      based_on_documents = ARRAY(
        SELECT DISTINCT unnest(based_on_documents || p_related_docs)
      ),
      sample_contexts = ARRAY(
        SELECT DISTINCT unnest(sample_contexts || p_sample_contexts)
        LIMIT 10
      ),
      updated_at = NOW()
    WHERE id = v_existing_id;
    
    RETURN v_existing_id;
  END IF;
  
  -- Buscar código do pai se fornecido
  IF p_parent_id IS NOT NULL THEN
    SELECT code INTO v_parent_code FROM global_taxonomy WHERE id = p_parent_id;
  END IF;
  
  -- Criar nova sugestão
  INSERT INTO taxonomy_suggestions (
    suggested_code,
    suggested_name,
    suggested_description,
    suggested_parent_id,
    suggested_parent_code,
    suggested_keywords,
    source,
    based_on_documents,
    confidence,
    sample_contexts
  ) VALUES (
    p_code,
    p_name,
    p_description,
    p_parent_id,
    v_parent_code,
    p_keywords,
    p_source,
    p_related_docs,
    p_confidence,
    p_sample_contexts
  )
  RETURNING id INTO v_suggestion_id;
  
  RETURN v_suggestion_id;
END;
$$;

-- ================================================================
-- 5. Função: Aprovar Sugestão de Taxonomia
-- ================================================================
CREATE OR REPLACE FUNCTION approve_taxonomy_suggestion(
  p_suggestion_id UUID,
  p_reviewer_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_modify_code TEXT DEFAULT NULL,
  p_modify_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion RECORD;
  v_taxonomy_id UUID;
  v_final_code TEXT;
  v_final_name TEXT;
  v_level INTEGER;
BEGIN
  -- Buscar sugestão
  SELECT * INTO v_suggestion
  FROM taxonomy_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sugestão não encontrada ou já processada';
  END IF;
  
  -- Usar código/nome modificado ou original
  v_final_code := COALESCE(p_modify_code, v_suggestion.suggested_code);
  v_final_name := COALESCE(p_modify_name, v_suggestion.suggested_name);
  
  -- Determinar nível
  IF v_suggestion.suggested_parent_id IS NOT NULL THEN
    SELECT level + 1 INTO v_level FROM global_taxonomy WHERE id = v_suggestion.suggested_parent_id;
  ELSE
    v_level := 1;
  END IF;
  
  -- Criar taxonomia
  INSERT INTO global_taxonomy (
    code,
    name,
    description,
    parent_id,
    level,
    keywords,
    synonyms,
    icon,
    color,
    auto_created,
    status
  ) VALUES (
    v_final_code,
    v_final_name,
    v_suggestion.suggested_description,
    v_suggestion.suggested_parent_id,
    COALESCE(v_level, 1),
    v_suggestion.suggested_keywords,
    v_suggestion.suggested_synonyms,
    v_suggestion.suggested_icon,
    v_suggestion.suggested_color,
    true,
    'active'
  )
  RETURNING id INTO v_taxonomy_id;
  
  -- Aplicar taxonomia aos documentos relacionados
  IF array_length(v_suggestion.based_on_documents, 1) > 0 THEN
    INSERT INTO entity_tags (entity_id, entity_type, taxonomy_id, source, confidence)
    SELECT 
      doc_id,
      'document',
      v_taxonomy_id,
      'auto_suggestion',
      v_suggestion.confidence
    FROM unnest(v_suggestion.based_on_documents) AS doc_id
    ON CONFLICT (entity_id, entity_type, taxonomy_id) DO NOTHING;
  END IF;
  
  -- Atualizar sugestão como aprovada
  UPDATE taxonomy_suggestions SET
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    reviewer_notes = p_notes,
    created_taxonomy_id = v_taxonomy_id
  WHERE id = p_suggestion_id;
  
  RETURN v_taxonomy_id;
END;
$$;

-- ================================================================
-- 6. Função: Rejeitar Sugestão de Taxonomia
-- ================================================================
CREATE OR REPLACE FUNCTION reject_taxonomy_suggestion(
  p_suggestion_id UUID,
  p_reviewer_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE taxonomy_suggestions SET
    status = 'rejected',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    reviewer_notes = p_notes
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- ================================================================
-- 7. Função: Extrair Keywords Frequentes
-- ================================================================
CREATE OR REPLACE FUNCTION extract_frequent_keywords(
  p_min_occurrences INTEGER DEFAULT 3,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  keyword TEXT,
  occurrence_count BIGINT,
  document_ids UUID[],
  sample_contexts TEXT[],
  existing_taxonomy_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH doc_keywords AS (
    -- Extrair keywords dos documentos sem taxonomia
    SELECT 
      d.id as doc_id,
      LOWER(TRIM(kw)) as keyword,
      LEFT(d.text_preview, 200) as context
    FROM documents d
    LEFT JOIN entity_tags et ON et.entity_id = d.id AND et.entity_type = 'document'
    CROSS JOIN LATERAL unnest(
      string_to_array(
        regexp_replace(
          COALESCE(d.ai_summary, d.text_preview, ''),
          '[^a-zA-ZÀ-ú\s]', ' ', 'g'
        ),
        ' '
      )
    ) AS kw
    WHERE d.status = 'completed'
      AND et.id IS NULL
      AND LENGTH(TRIM(kw)) > 3
  ),
  keyword_stats AS (
    SELECT 
      dk.keyword,
      COUNT(DISTINCT dk.doc_id) as occ_count,
      ARRAY_AGG(DISTINCT dk.doc_id) as doc_ids,
      ARRAY_AGG(DISTINCT dk.context) FILTER (WHERE dk.context IS NOT NULL) as contexts
    FROM doc_keywords dk
    GROUP BY dk.keyword
    HAVING COUNT(DISTINCT dk.doc_id) >= p_min_occurrences
  )
  SELECT 
    ks.keyword,
    ks.occ_count as occurrence_count,
    ks.doc_ids as document_ids,
    (SELECT ARRAY_AGG(c) FROM (SELECT unnest(ks.contexts) AS c LIMIT 3) x) as sample_contexts,
    gt.code as existing_taxonomy_code
  FROM keyword_stats ks
  LEFT JOIN global_taxonomy gt ON (
    LOWER(gt.name) = ks.keyword 
    OR ks.keyword = ANY(SELECT LOWER(unnest(gt.keywords)))
    OR ks.keyword = ANY(SELECT LOWER(unnest(gt.synonyms)))
  )
  ORDER BY ks.occ_count DESC
  LIMIT p_limit;
END;
$$;