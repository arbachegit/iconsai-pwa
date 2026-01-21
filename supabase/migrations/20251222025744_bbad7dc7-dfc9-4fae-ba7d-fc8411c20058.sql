-- ================================================================
-- FASE 4: RE-CLASSIFICAR DOCUMENTOS
-- Tabela de jobs e funções SQL de re-classificação
-- ================================================================

-- 1. Tabela para controle de jobs de re-classificação
CREATE TABLE IF NOT EXISTS public.reclassification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter TEXT NOT NULL DEFAULT 'no_taxonomy',
  batch_size INTEGER NOT NULL DEFAULT 10,
  auto_approve_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.90,
  status TEXT NOT NULL DEFAULT 'pending',
  total_documents INTEGER DEFAULT 0,
  processed_documents INTEGER DEFAULT 0,
  auto_approved_count INTEGER DEFAULT 0,
  pending_review_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  current_batch INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reclassification_jobs_status ON reclassification_jobs(status);
CREATE INDEX IF NOT EXISTS idx_reclassification_jobs_created_at ON reclassification_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.reclassification_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage reclassification_jobs"
  ON public.reclassification_jobs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert reclassification_jobs"
  ON public.reclassification_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update reclassification_jobs"
  ON public.reclassification_jobs FOR UPDATE
  USING (true);

-- 2. Função para obter estatísticas de cobertura de taxonomia
CREATE OR REPLACE FUNCTION get_taxonomy_coverage_stats()
RETURNS TABLE(
  total_documents INTEGER,
  documents_with_taxonomy INTEGER,
  documents_without_taxonomy INTEGER,
  coverage_percentage NUMERIC,
  avg_tags_per_document NUMERIC,
  documents_by_source JSONB,
  pending_classification INTEGER,
  low_confidence_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH doc_stats AS (
    SELECT 
      d.id,
      COALESCE(et_count.tag_count, 0) as tag_count,
      COALESCE(et_count.avg_conf, 0) as avg_confidence
    FROM documents d
    LEFT JOIN (
      SELECT 
        entity_id,
        COUNT(*) as tag_count,
        AVG(confidence) as avg_conf
      FROM entity_tags 
      WHERE entity_type = 'document'
      GROUP BY entity_id
    ) et_count ON et_count.entity_id = d.id::text
    WHERE d.status = 'completed'
  ),
  source_stats AS (
    SELECT 
      source,
      COUNT(*) as count
    FROM entity_tags
    WHERE entity_type = 'document'
    GROUP BY source
  ),
  pending_tags AS (
    SELECT COUNT(DISTINCT dt.document_id) as cnt
    FROM document_tags dt
    WHERE dt.tag_name LIKE '%pendente%' OR dt.tag_name LIKE '%classificacao%'
  ),
  low_conf AS (
    SELECT COUNT(DISTINCT entity_id) as cnt
    FROM entity_tags
    WHERE entity_type = 'document' AND confidence < 0.7
  )
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM doc_stats) as total_documents,
    (SELECT COUNT(*)::INTEGER FROM doc_stats WHERE tag_count > 0) as documents_with_taxonomy,
    (SELECT COUNT(*)::INTEGER FROM doc_stats WHERE tag_count = 0) as documents_without_taxonomy,
    ROUND(
      CASE 
        WHEN (SELECT COUNT(*) FROM doc_stats) > 0 
        THEN (SELECT COUNT(*) FROM doc_stats WHERE tag_count > 0)::NUMERIC / (SELECT COUNT(*) FROM doc_stats) * 100
        ELSE 0 
      END, 
      2
    ) as coverage_percentage,
    ROUND(
      (SELECT AVG(tag_count) FROM doc_stats WHERE tag_count > 0)::NUMERIC,
      2
    ) as avg_tags_per_document,
    COALESCE(
      (SELECT jsonb_object_agg(source, count) FROM source_stats),
      '{}'::jsonb
    ) as documents_by_source,
    COALESCE((SELECT cnt::INTEGER FROM pending_tags), 0) as pending_classification,
    COALESCE((SELECT cnt::INTEGER FROM low_conf), 0) as low_confidence_count;
END;
$$;

-- 3. Função para obter documentos para re-classificação
CREATE OR REPLACE FUNCTION get_documents_for_reclassification(
  p_filter TEXT DEFAULT 'no_taxonomy',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  document_id UUID,
  filename TEXT,
  target_chat TEXT,
  ai_summary TEXT,
  text_preview TEXT,
  created_at TIMESTAMPTZ,
  current_taxonomies JSONB,
  tag_count INTEGER,
  avg_confidence NUMERIC,
  has_pending_tag BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH doc_tags AS (
    SELECT 
      et.entity_id::uuid as doc_id,
      jsonb_agg(
        jsonb_build_object(
          'taxonomy_id', et.taxonomy_id,
          'code', gt.code,
          'name', gt.name,
          'confidence', et.confidence,
          'source', et.source
        )
      ) as taxonomies,
      COUNT(*)::INTEGER as cnt,
      AVG(et.confidence)::NUMERIC as avg_conf
    FROM entity_tags et
    JOIN global_taxonomy gt ON gt.id = et.taxonomy_id
    WHERE et.entity_type = 'document'
    GROUP BY et.entity_id
  ),
  pending_docs AS (
    SELECT DISTINCT document_id as doc_id
    FROM document_tags
    WHERE tag_name LIKE '%pendente%' OR tag_name LIKE '%classificacao%'
  )
  SELECT 
    d.id as document_id,
    d.filename,
    d.target_chat,
    d.ai_summary,
    d.text_preview,
    d.created_at,
    COALESCE(dt.taxonomies, '[]'::jsonb) as current_taxonomies,
    COALESCE(dt.cnt, 0) as tag_count,
    COALESCE(ROUND(dt.avg_conf, 2), 0) as avg_confidence,
    (pd.doc_id IS NOT NULL) as has_pending_tag
  FROM documents d
  LEFT JOIN doc_tags dt ON dt.doc_id = d.id
  LEFT JOIN pending_docs pd ON pd.doc_id = d.id
  WHERE d.status = 'completed'
    AND (
      CASE p_filter
        WHEN 'no_taxonomy' THEN dt.doc_id IS NULL
        WHEN 'pending_classification' THEN pd.doc_id IS NOT NULL
        WHEN 'low_confidence' THEN dt.avg_conf < 0.7
        WHEN 'all' THEN TRUE
        ELSE TRUE
      END
    )
  ORDER BY d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 4. Função para aplicar taxonomias em lote
CREATE OR REPLACE FUNCTION apply_batch_taxonomy(
  p_batch JSONB
)
RETURNS TABLE(
  success_count INTEGER,
  error_count INTEGER,
  errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_doc_id UUID;
  v_taxonomy_code TEXT;
  v_taxonomy_id UUID;
  v_source TEXT;
  v_confidence NUMERIC;
  v_success INTEGER := 0;
  v_errors INTEGER := 0;
  v_error_list JSONB := '[]'::jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_batch)
  LOOP
    BEGIN
      v_doc_id := (v_item->>'document_id')::UUID;
      v_source := COALESCE(v_item->>'source', 'manual');
      v_confidence := COALESCE((v_item->>'confidence')::NUMERIC, 1.0);
      
      -- Processa cada código de taxonomia
      FOR v_taxonomy_code IN SELECT * FROM jsonb_array_elements_text(v_item->'taxonomy_codes')
      LOOP
        -- Busca o ID da taxonomia pelo código
        SELECT id INTO v_taxonomy_id
        FROM global_taxonomy
        WHERE code = v_taxonomy_code;
        
        IF v_taxonomy_id IS NULL THEN
          v_errors := v_errors + 1;
          v_error_list := v_error_list || jsonb_build_object(
            'document_id', v_doc_id,
            'taxonomy_code', v_taxonomy_code,
            'error', 'Taxonomy code not found'
          );
          CONTINUE;
        END IF;
        
        -- Insere ou atualiza entity_tag
        INSERT INTO entity_tags (entity_id, entity_type, taxonomy_id, source, confidence)
        VALUES (v_doc_id::TEXT, 'document', v_taxonomy_id, v_source, v_confidence)
        ON CONFLICT (entity_id, entity_type, taxonomy_id) 
        DO UPDATE SET 
          confidence = EXCLUDED.confidence,
          source = EXCLUDED.source;
        
        v_success := v_success + 1;
      END LOOP;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_error_list := v_error_list || jsonb_build_object(
        'document_id', v_doc_id,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_success, v_errors, v_error_list;
END;
$$;

-- 5. Função auxiliar para contar documentos por filtro
CREATE OR REPLACE FUNCTION count_documents_for_reclassification(
  p_filter TEXT DEFAULT 'no_taxonomy'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH doc_tags AS (
    SELECT DISTINCT entity_id::uuid as doc_id
    FROM entity_tags 
    WHERE entity_type = 'document'
  ),
  pending_docs AS (
    SELECT DISTINCT document_id as doc_id
    FROM document_tags
    WHERE tag_name LIKE '%pendente%' OR tag_name LIKE '%classificacao%'
  ),
  low_conf_docs AS (
    SELECT DISTINCT entity_id::uuid as doc_id
    FROM entity_tags
    WHERE entity_type = 'document' AND confidence < 0.7
  )
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM documents d
  LEFT JOIN doc_tags dt ON dt.doc_id = d.id
  LEFT JOIN pending_docs pd ON pd.doc_id = d.id
  LEFT JOIN low_conf_docs lc ON lc.doc_id = d.id
  WHERE d.status = 'completed'
    AND (
      CASE p_filter
        WHEN 'no_taxonomy' THEN dt.doc_id IS NULL
        WHEN 'pending_classification' THEN pd.doc_id IS NOT NULL
        WHEN 'low_confidence' THEN lc.doc_id IS NOT NULL
        WHEN 'all' THEN TRUE
        ELSE TRUE
      END
    );
  
  RETURN v_count;
END;
$$;

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_reclassification_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reclassification_job_timestamp ON reclassification_jobs;
CREATE TRIGGER trigger_update_reclassification_job_timestamp
  BEFORE UPDATE ON reclassification_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_reclassification_job_timestamp();