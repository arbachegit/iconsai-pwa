-- =====================================================
-- FASE 7: ANALYTICS E RELATÓRIOS DE TAXONOMIA
-- =====================================================

-- PARTE 1: TABELA DE MÉTRICAS HISTÓRICAS
CREATE TABLE IF NOT EXISTS public.taxonomy_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  total_documents INT DEFAULT 0,
  documents_with_taxonomy INT DEFAULT 0,
  documents_without_taxonomy INT DEFAULT 0,
  coverage_percentage FLOAT DEFAULT 0,
  total_taxonomies INT DEFAULT 0,
  active_taxonomies INT DEFAULT 0,
  orphan_taxonomies INT DEFAULT 0,
  new_taxonomies_created INT DEFAULT 0,
  classifications_auto INT DEFAULT 0,
  classifications_manual INT DEFAULT 0,
  classifications_ai_suggested INT DEFAULT 0,
  avg_confidence FLOAT,
  suggestions_approved INT DEFAULT 0,
  suggestions_rejected INT DEFAULT 0,
  suggestions_pending INT DEFAULT 0,
  onboarded_documents INT DEFAULT 0,
  auto_classified INT DEFAULT 0,
  pending_review INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_date ON taxonomy_metrics_daily(metric_date DESC);

-- PARTE 2: FUNÇÃO PARA COLETAR MÉTRICAS DO DIA
CREATE OR REPLACE FUNCTION collect_daily_taxonomy_metrics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  v_total_docs INT;
  v_with_tax INT;
  v_total_tax INT;
  v_active_tax INT;
  v_orphan_tax INT;
  v_new_tax INT;
  v_auto_class INT;
  v_manual_class INT;
  v_ai_class INT;
  v_avg_conf FLOAT;
  v_sug_approved INT;
  v_sug_rejected INT;
  v_sug_pending INT;
  v_onboarded INT;
  v_auto_onboard INT;
  v_pending_review INT;
BEGIN
  -- Documentos
  SELECT COUNT(*) INTO v_total_docs
  FROM documents WHERE status = 'completed' AND is_readable = true;
  
  SELECT COUNT(DISTINCT entity_id) INTO v_with_tax
  FROM entity_tags WHERE entity_type = 'document';
  
  -- Taxonomias
  SELECT COUNT(*) INTO v_total_tax FROM global_taxonomy;
  
  SELECT COUNT(*) INTO v_active_tax
  FROM global_taxonomy gt
  WHERE EXISTS (SELECT 1 FROM entity_tags et WHERE et.taxonomy_id = gt.id);
  
  SELECT COUNT(*) INTO v_orphan_tax
  FROM global_taxonomy gt
  WHERE gt.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM entity_tags et WHERE et.taxonomy_id = gt.id);
  
  SELECT COUNT(*) INTO v_new_tax
  FROM global_taxonomy
  WHERE DATE(created_at) = p_date;
  
  -- Classificações por fonte (do dia)
  SELECT 
    COUNT(*) FILTER (WHERE source = 'ai_auto'),
    COUNT(*) FILTER (WHERE source IN ('admin', 'manual')),
    COUNT(*) FILTER (WHERE source = 'ai_suggested'),
    AVG(confidence)
  INTO v_auto_class, v_manual_class, v_ai_class, v_avg_conf
  FROM entity_tags
  WHERE DATE(created_at) = p_date;
  
  -- Sugestões
  SELECT 
    COUNT(*) FILTER (WHERE status = 'approved' AND DATE(reviewed_at) = p_date),
    COUNT(*) FILTER (WHERE status = 'rejected' AND DATE(reviewed_at) = p_date),
    COUNT(*) FILTER (WHERE status = 'pending')
  INTO v_sug_approved, v_sug_rejected, v_sug_pending
  FROM taxonomy_suggestions;
  
  -- Onboarding
  BEGIN
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'auto_classified'),
      COUNT(*) FILTER (WHERE status = 'pending_review')
    INTO v_onboarded, v_auto_onboard, v_pending_review
    FROM document_onboarding_log
    WHERE DATE(created_at) = p_date;
  EXCEPTION WHEN undefined_table THEN
    v_onboarded := 0;
    v_auto_onboard := 0;
    v_pending_review := 0;
  END;
  
  -- Inserir ou atualizar métrica do dia
  INSERT INTO taxonomy_metrics_daily (
    metric_date,
    total_documents, documents_with_taxonomy, documents_without_taxonomy, coverage_percentage,
    total_taxonomies, active_taxonomies, orphan_taxonomies, new_taxonomies_created,
    classifications_auto, classifications_manual, classifications_ai_suggested, avg_confidence,
    suggestions_approved, suggestions_rejected, suggestions_pending,
    onboarded_documents, auto_classified, pending_review
  ) VALUES (
    p_date,
    v_total_docs, v_with_tax, v_total_docs - v_with_tax, 
    CASE WHEN v_total_docs > 0 THEN (v_with_tax::FLOAT / v_total_docs * 100) ELSE 0 END,
    v_total_tax, v_active_tax, v_orphan_tax, COALESCE(v_new_tax, 0),
    COALESCE(v_auto_class, 0), COALESCE(v_manual_class, 0), COALESCE(v_ai_class, 0), v_avg_conf,
    COALESCE(v_sug_approved, 0), COALESCE(v_sug_rejected, 0), COALESCE(v_sug_pending, 0),
    COALESCE(v_onboarded, 0), COALESCE(v_auto_onboard, 0), COALESCE(v_pending_review, 0)
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    total_documents = EXCLUDED.total_documents,
    documents_with_taxonomy = EXCLUDED.documents_with_taxonomy,
    documents_without_taxonomy = EXCLUDED.documents_without_taxonomy,
    coverage_percentage = EXCLUDED.coverage_percentage,
    total_taxonomies = EXCLUDED.total_taxonomies,
    active_taxonomies = EXCLUDED.active_taxonomies,
    orphan_taxonomies = EXCLUDED.orphan_taxonomies,
    new_taxonomies_created = EXCLUDED.new_taxonomies_created,
    classifications_auto = EXCLUDED.classifications_auto,
    classifications_manual = EXCLUDED.classifications_manual,
    classifications_ai_suggested = EXCLUDED.classifications_ai_suggested,
    avg_confidence = EXCLUDED.avg_confidence,
    suggestions_approved = EXCLUDED.suggestions_approved,
    suggestions_rejected = EXCLUDED.suggestions_rejected,
    suggestions_pending = EXCLUDED.suggestions_pending,
    onboarded_documents = EXCLUDED.onboarded_documents,
    auto_classified = EXCLUDED.auto_classified,
    pending_review = EXCLUDED.pending_review;
END;
$$ LANGUAGE plpgsql;

-- PARTE 3: FUNÇÃO PARA RELATÓRIO COMPLETO
CREATE OR REPLACE FUNCTION get_taxonomy_analytics_report(p_days INT DEFAULT 30)
RETURNS TABLE (
  current_coverage FLOAT,
  current_total_docs INT,
  current_with_taxonomy INT,
  current_total_taxonomies INT,
  current_active_taxonomies INT,
  coverage_trend FLOAT,
  docs_trend INT,
  taxonomies_trend INT,
  total_auto_classifications INT,
  total_manual_classifications INT,
  auto_rate FLOAT,
  avg_confidence FLOAT,
  total_suggestions_processed INT,
  approval_rate FLOAT,
  pending_suggestions INT,
  top_taxonomies JSONB,
  docs_without_taxonomy INT,
  docs_low_confidence INT
) AS $$
DECLARE
  v_current RECORD;
  v_previous RECORD;
  v_top_tax JSONB;
BEGIN
  PERFORM collect_daily_taxonomy_metrics(CURRENT_DATE);
  
  SELECT 
    AVG(tmd.coverage_percentage),
    MAX(tmd.total_documents),
    MAX(tmd.documents_with_taxonomy),
    MAX(tmd.total_taxonomies),
    MAX(tmd.active_taxonomies),
    SUM(tmd.classifications_auto),
    SUM(tmd.classifications_manual),
    AVG(tmd.avg_confidence),
    SUM(tmd.suggestions_approved),
    SUM(tmd.suggestions_rejected),
    MAX(tmd.suggestions_pending)
  INTO v_current
  FROM taxonomy_metrics_daily tmd
  WHERE tmd.metric_date >= CURRENT_DATE - p_days;
  
  SELECT 
    AVG(tmd.coverage_percentage),
    MAX(tmd.total_documents),
    MAX(tmd.total_taxonomies)
  INTO v_previous
  FROM taxonomy_metrics_daily tmd
  WHERE tmd.metric_date >= CURRENT_DATE - (p_days * 2)
  AND tmd.metric_date < CURRENT_DATE - p_days;
  
  SELECT jsonb_agg(t ORDER BY doc_count DESC)
  INTO v_top_tax
  FROM (
    SELECT 
      gt.code,
      gt.name,
      COUNT(et.id) as doc_count
    FROM global_taxonomy gt
    LEFT JOIN entity_tags et ON et.taxonomy_id = gt.id
    WHERE gt.status = 'approved'
    GROUP BY gt.id, gt.code, gt.name
    ORDER BY COUNT(et.id) DESC
    LIMIT 10
  ) t;
  
  RETURN QUERY SELECT
    COALESCE(v_current.avg, 0)::FLOAT,
    COALESCE(v_current.max, 0)::INT,
    COALESCE(v_current.max_1, 0)::INT,
    COALESCE(v_current.max_2, 0)::INT,
    COALESCE(v_current.max_3, 0)::INT,
    COALESCE(v_current.avg - v_previous.avg, 0)::FLOAT,
    COALESCE(v_current.max - v_previous.max_1, 0)::INT,
    COALESCE(v_current.max_2 - v_previous.max_2, 0)::INT,
    COALESCE(v_current.sum, 0)::INT,
    COALESCE(v_current.sum_1, 0)::INT,
    CASE WHEN (COALESCE(v_current.sum, 0) + COALESCE(v_current.sum_1, 0)) > 0 
      THEN (v_current.sum::FLOAT / (v_current.sum + v_current.sum_1) * 100)
      ELSE 0 END::FLOAT,
    COALESCE(v_current.avg_1, 0)::FLOAT,
    (COALESCE(v_current.sum_2, 0) + COALESCE(v_current.sum_3, 0))::INT,
    CASE WHEN (COALESCE(v_current.sum_2, 0) + COALESCE(v_current.sum_3, 0)) > 0
      THEN (v_current.sum_2::FLOAT / (v_current.sum_2 + v_current.sum_3) * 100)
      ELSE 0 END::FLOAT,
    COALESCE(v_current.max_4, 0)::INT,
    COALESCE(v_top_tax, '[]'::jsonb),
    (SELECT COUNT(*)::INT FROM documents d 
      WHERE d.status = 'completed' AND d.is_readable = true
      AND NOT EXISTS (SELECT 1 FROM entity_tags et WHERE et.entity_id = d.id)),
    (SELECT COUNT(DISTINCT entity_id)::INT FROM entity_tags WHERE confidence < 0.7);
END;
$$ LANGUAGE plpgsql;

-- PARTE 4: MÉTRICAS POR PERÍODO (APRIMORADA)
DROP FUNCTION IF EXISTS get_taxonomy_metrics_timeseries(INT);
CREATE OR REPLACE FUNCTION get_taxonomy_metrics_timeseries(p_days INT DEFAULT 30)
RETURNS TABLE (
  metric_date DATE,
  coverage_percentage FLOAT,
  total_documents INT,
  documents_with_taxonomy INT,
  classifications_total INT,
  avg_confidence FLOAT
) AS $$
BEGIN
  FOR i IN 0..p_days LOOP
    PERFORM collect_daily_taxonomy_metrics(CURRENT_DATE - i);
  END LOOP;
  
  RETURN QUERY
  SELECT 
    m.metric_date,
    m.coverage_percentage,
    m.total_documents,
    m.documents_with_taxonomy,
    (m.classifications_auto + m.classifications_manual + m.classifications_ai_suggested),
    m.avg_confidence
  FROM taxonomy_metrics_daily m
  WHERE m.metric_date >= CURRENT_DATE - p_days
  ORDER BY m.metric_date ASC;
END;
$$ LANGUAGE plpgsql;

-- PARTE 5: DISTRIBUIÇÃO POR DOMÍNIO (APRIMORADA)
DROP FUNCTION IF EXISTS get_taxonomy_distribution_by_domain();
CREATE OR REPLACE FUNCTION get_taxonomy_distribution_by_domain()
RETURNS TABLE (
  domain TEXT,
  taxonomy_count INT,
  document_count INT,
  avg_confidence FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(gt.domain, 'geral') as domain,
    COUNT(DISTINCT gt.id)::INT as taxonomy_count,
    COUNT(DISTINCT et.entity_id)::INT as document_count,
    AVG(et.confidence)::FLOAT as avg_confidence
  FROM global_taxonomy gt
  LEFT JOIN entity_tags et ON et.taxonomy_id = gt.id
  WHERE gt.status = 'approved'
  GROUP BY gt.domain
  ORDER BY COUNT(DISTINCT et.entity_id) DESC;
END;
$$ LANGUAGE plpgsql;

-- PARTE 6: FONTES DE CLASSIFICAÇÃO (APRIMORADA)
DROP FUNCTION IF EXISTS get_classification_sources_stats();
CREATE OR REPLACE FUNCTION get_classification_sources_stats()
RETURNS TABLE (
  source TEXT,
  classification_count INT,
  avg_confidence FLOAT,
  percentage FLOAT
) AS $$
DECLARE
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM entity_tags;
  
  RETURN QUERY
  SELECT 
    et.source,
    COUNT(*)::INT,
    AVG(et.confidence)::FLOAT,
    (COUNT(*)::FLOAT / NULLIF(v_total, 0) * 100)::FLOAT
  FROM entity_tags et
  GROUP BY et.source
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- PARTE 7: RLS E PERMISSÕES
ALTER TABLE taxonomy_metrics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for taxonomy_metrics_daily" ON taxonomy_metrics_daily;
CREATE POLICY "Allow read for taxonomy_metrics_daily" 
ON taxonomy_metrics_daily FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for taxonomy_metrics_daily" ON taxonomy_metrics_daily;
CREATE POLICY "Allow insert for taxonomy_metrics_daily" 
ON taxonomy_metrics_daily FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for taxonomy_metrics_daily" ON taxonomy_metrics_daily;
CREATE POLICY "Allow update for taxonomy_metrics_daily" 
ON taxonomy_metrics_daily FOR UPDATE USING (true);

-- PARTE 8: COLETAR MÉTRICAS INICIAIS (últimos 7 dias)
DO $$
BEGIN
  FOR i IN 0..6 LOOP
    PERFORM collect_daily_taxonomy_metrics(CURRENT_DATE - i);
  END LOOP;
END $$;