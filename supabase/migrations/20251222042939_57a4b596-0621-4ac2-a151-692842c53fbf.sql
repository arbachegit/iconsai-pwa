
-- =====================================================
-- FASE 6: ONBOARDING INTELIGENTE
-- =====================================================

-- =====================================================
-- PARTE 1: TABELA DE LOG DE ONBOARDING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.document_onboarding_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- Resultado do onboarding
  status TEXT NOT NULL CHECK (status IN ('auto_classified', 'pending_review', 'no_suggestions', 'error')),
  
  -- Taxonomias aplicadas/sugeridas
  applied_taxonomies JSONB DEFAULT '[]'::jsonb,
  suggested_taxonomies JSONB DEFAULT '[]'::jsonb,
  
  -- Métricas
  highest_confidence FLOAT,
  avg_confidence FLOAT,
  total_suggestions INT DEFAULT 0,
  auto_applied_count INT DEFAULT 0,
  
  -- Contexto
  source_text_preview TEXT,
  processing_time_ms INT,
  
  -- Error handling
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_onboarding_document ON public.document_onboarding_log(document_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON public.document_onboarding_log(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_created ON public.document_onboarding_log(created_at DESC);

-- RLS
ALTER TABLE public.document_onboarding_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document_onboarding_log"
  ON public.document_onboarding_log
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert onboarding logs"
  ON public.document_onboarding_log
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- PARTE 2: FUNÇÃO PRINCIPAL DE ONBOARDING
-- =====================================================

CREATE OR REPLACE FUNCTION public.onboard_document_taxonomy(
  p_document_id UUID,
  p_auto_apply_threshold FLOAT DEFAULT 0.9,
  p_review_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  status TEXT,
  applied_count INT,
  pending_count INT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_text TEXT;
  v_suggestions JSONB;
  v_suggestion JSONB;
  v_applied JSONB := '[]'::jsonb;
  v_pending JSONB := '[]'::jsonb;
  v_applied_count INT := 0;
  v_pending_count INT := 0;
  v_taxonomy_id UUID;
  v_status TEXT;
  v_highest_conf FLOAT := 0;
  v_total_conf FLOAT := 0;
  v_suggestion_count INT := 0;
BEGIN
  -- Buscar documento
  SELECT d.id, d.filename, d.ai_summary, d.target_chat
  INTO v_doc
  FROM documents d
  WHERE d.id = p_document_id AND d.status = 'completed';
  
  IF NOT FOUND THEN
    INSERT INTO document_onboarding_log (document_id, status, error_message)
    VALUES (p_document_id, 'error', 'Document not found or not completed');
    
    RETURN QUERY SELECT 'error'::TEXT, 0, 0, 'Documento não encontrado ou não processado'::TEXT;
    RETURN;
  END IF;
  
  -- Texto para análise
  v_text := COALESCE(v_doc.ai_summary, v_doc.filename);
  
  -- Verificar se já tem taxonomias
  IF EXISTS (
    SELECT 1 FROM entity_tags et 
    WHERE et.entity_id = p_document_id 
    AND et.entity_type = 'document'
    AND et.source != 'inherited'
  ) THEN
    INSERT INTO document_onboarding_log (
      document_id, status, source_text_preview
    ) VALUES (
      p_document_id, 'auto_classified', LEFT(v_text, 500)
    );
    
    RETURN QUERY SELECT 'already_classified'::TEXT, 0, 0, 'Documento já possui taxonomias'::TEXT;
    RETURN;
  END IF;
  
  -- Buscar sugestões baseadas em keywords da taxonomia
  WITH keyword_matches AS (
    SELECT 
      gt.id as taxonomy_id,
      gt.code,
      gt.name,
      GREATEST(0.5, LEAST(1.0, 
        0.5 + (
          SELECT COUNT(*) * 0.1
          FROM unnest(gt.keywords) kw
          WHERE v_text ILIKE '%' || kw || '%'
        ) + (
          SELECT COUNT(*) * 0.05
          FROM unnest(gt.synonyms) syn
          WHERE v_text ILIKE '%' || syn || '%'
        )
      )) as confidence
    FROM global_taxonomy gt
    WHERE gt.status = 'approved'
      AND (
        EXISTS (
          SELECT 1 FROM unnest(gt.keywords) kw
          WHERE v_text ILIKE '%' || kw || '%'
        )
        OR EXISTS (
          SELECT 1 FROM unnest(gt.synonyms) syn
          WHERE v_text ILIKE '%' || syn || '%'
        )
        OR v_text ILIKE '%' || gt.code || '%'
        OR v_text ILIKE '%' || gt.name || '%'
      )
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'taxonomy_id', km.taxonomy_id,
      'code', km.code,
      'name', km.name,
      'confidence', km.confidence
    ) ORDER BY km.confidence DESC
  )
  INTO v_suggestions
  FROM keyword_matches km
  WHERE km.confidence >= p_review_threshold;
  
  -- Sem sugestões
  IF v_suggestions IS NULL OR jsonb_array_length(v_suggestions) = 0 THEN
    SELECT gt.id INTO v_taxonomy_id
    FROM global_taxonomy gt
    WHERE gt.code = '_pendente.classificacao';
    
    IF v_taxonomy_id IS NOT NULL THEN
      INSERT INTO entity_tags (entity_id, entity_type, taxonomy_id, source, confidence)
      VALUES (p_document_id, 'document', v_taxonomy_id, 'auto', 0.3)
      ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;
    END IF;
    
    INSERT INTO document_onboarding_log (
      document_id, status, source_text_preview, total_suggestions
    ) VALUES (
      p_document_id, 'no_suggestions', LEFT(v_text, 500), 0
    );
    
    RETURN QUERY SELECT 'no_suggestions'::TEXT, 0, 0, 'Nenhuma taxonomia sugerida - marcado como pendente'::TEXT;
    RETURN;
  END IF;
  
  -- Processar sugestões
  FOR v_suggestion IN SELECT * FROM jsonb_array_elements(v_suggestions)
  LOOP
    v_suggestion_count := v_suggestion_count + 1;
    v_total_conf := v_total_conf + (v_suggestion->>'confidence')::FLOAT;
    
    IF (v_suggestion->>'confidence')::FLOAT > v_highest_conf THEN
      v_highest_conf := (v_suggestion->>'confidence')::FLOAT;
    END IF;
    
    IF (v_suggestion->>'confidence')::FLOAT >= p_auto_apply_threshold THEN
      INSERT INTO entity_tags (entity_id, entity_type, taxonomy_id, source, confidence)
      VALUES (
        p_document_id, 
        'document', 
        (v_suggestion->>'taxonomy_id')::UUID, 
        'ai_auto',
        (v_suggestion->>'confidence')::FLOAT
      )
      ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;
      
      v_applied := v_applied || v_suggestion;
      v_applied_count := v_applied_count + 1;
    ELSE
      v_pending := v_pending || v_suggestion;
      v_pending_count := v_pending_count + 1;
    END IF;
  END LOOP;
  
  -- Determinar status
  IF v_applied_count > 0 THEN
    v_status := 'auto_classified';
  ELSE
    v_status := 'pending_review';
  END IF;
  
  -- Registrar log
  INSERT INTO document_onboarding_log (
    document_id,
    status,
    applied_taxonomies,
    suggested_taxonomies,
    highest_confidence,
    avg_confidence,
    total_suggestions,
    auto_applied_count,
    source_text_preview
  ) VALUES (
    p_document_id,
    v_status,
    v_applied,
    v_pending,
    v_highest_conf,
    v_total_conf / NULLIF(v_suggestion_count, 0),
    v_suggestion_count,
    v_applied_count,
    LEFT(v_text, 500)
  );
  
  RETURN QUERY SELECT 
    v_status,
    v_applied_count,
    v_pending_count,
    format('Aplicadas: %s, Para revisão: %s', v_applied_count, v_pending_count)::TEXT;
    
END;
$$;

-- =====================================================
-- PARTE 3: FUNÇÃO PARA PROCESSAR DOCUMENTOS PENDENTES
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_pending_onboarding(
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  processed INT,
  auto_classified INT,
  pending_review INT,
  no_suggestions INT,
  errors INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_result RECORD;
  v_processed INT := 0;
  v_auto INT := 0;
  v_pending INT := 0;
  v_no_sug INT := 0;
  v_errors INT := 0;
BEGIN
  FOR v_doc IN 
    SELECT d.id
    FROM documents d
    WHERE d.status = 'completed'
      AND d.is_readable = true
      AND NOT EXISTS (
        SELECT 1 FROM entity_tags et 
        WHERE et.entity_id = d.id 
        AND et.entity_type = 'document'
      )
      AND NOT EXISTS (
        SELECT 1 FROM document_onboarding_log ol
        WHERE ol.document_id = d.id
        AND ol.created_at > NOW() - INTERVAL '1 day'
      )
    ORDER BY d.created_at DESC
    LIMIT p_limit
  LOOP
    BEGIN
      SELECT * INTO v_result
      FROM onboard_document_taxonomy(v_doc.id);
      
      v_processed := v_processed + 1;
      
      IF v_result.status = 'auto_classified' OR v_result.status = 'already_classified' THEN
        v_auto := v_auto + 1;
      ELSIF v_result.status = 'pending_review' THEN
        v_pending := v_pending + 1;
      ELSIF v_result.status = 'no_suggestions' THEN
        v_no_sug := v_no_sug + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_auto, v_pending, v_no_sug, v_errors;
END;
$$;

-- =====================================================
-- PARTE 4: ESTATÍSTICAS DE ONBOARDING
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_onboarding_stats()
RETURNS TABLE (
  total_onboarded INT,
  auto_classified INT,
  pending_review INT,
  no_suggestions INT,
  errors INT,
  avg_confidence FLOAT,
  last_24h_count INT,
  pending_documents INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM document_onboarding_log),
    (SELECT COUNT(*)::INT FROM document_onboarding_log WHERE document_onboarding_log.status = 'auto_classified'),
    (SELECT COUNT(*)::INT FROM document_onboarding_log WHERE document_onboarding_log.status = 'pending_review'),
    (SELECT COUNT(*)::INT FROM document_onboarding_log WHERE document_onboarding_log.status = 'no_suggestions'),
    (SELECT COUNT(*)::INT FROM document_onboarding_log WHERE document_onboarding_log.status = 'error'),
    (SELECT AVG(document_onboarding_log.avg_confidence) FROM document_onboarding_log WHERE document_onboarding_log.avg_confidence IS NOT NULL),
    (SELECT COUNT(*)::INT FROM document_onboarding_log WHERE document_onboarding_log.created_at > NOW() - INTERVAL '24 hours'),
    (SELECT COUNT(*)::INT FROM documents d 
     WHERE d.status = 'completed' AND d.is_readable = true
     AND NOT EXISTS (
       SELECT 1 FROM entity_tags et 
       WHERE et.entity_id = d.id AND et.entity_type = 'document'
     ));
END;
$$;

-- =====================================================
-- PARTE 5: TRIGGER PARA AUTO-ONBOARDING (DESABILITADO)
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_document_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    RAISE NOTICE 'Document % ready for onboarding', NEW.id;
    -- Opcional: PERFORM onboard_document_taxonomy(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger desabilitado por padrão (descomente para ativar)
-- DROP TRIGGER IF EXISTS trg_document_onboarding ON documents;
-- CREATE TRIGGER trg_document_onboarding
--   AFTER UPDATE ON documents
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_document_onboarding();
