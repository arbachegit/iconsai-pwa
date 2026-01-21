
-- ========================================
-- FUNÇÃO 1: get_taxonomy_metrics_timeseries
-- Retorna métricas diárias de taxonomia
-- ========================================
CREATE OR REPLACE FUNCTION public.get_taxonomy_metrics_timeseries(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  metric_date DATE,
  coverage_percentage NUMERIC,
  total_documents BIGINT,
  documents_with_taxonomy BIGINT,
  classifications_total BIGINT,
  avg_confidence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days || ' days')::INTERVAL,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE AS d
  ),
  daily_docs AS (
    SELECT 
      ds.d AS metric_date,
      COUNT(DISTINCT doc.id) AS total_docs,
      COUNT(DISTINCT CASE WHEN et.id IS NOT NULL THEN doc.id END) AS docs_with_tax
    FROM date_series ds
    LEFT JOIN documents doc ON doc.created_at::DATE <= ds.d AND doc.status = 'completed'
    LEFT JOIN entity_tags et ON et.entity_id = doc.id::TEXT AND et.entity_type = 'document' AND et.created_at::DATE <= ds.d
    GROUP BY ds.d
  ),
  daily_classifications AS (
    SELECT 
      ds.d AS metric_date,
      COUNT(et.id) AS class_count,
      AVG(et.confidence) AS avg_conf
    FROM date_series ds
    LEFT JOIN entity_tags et ON et.created_at::DATE = ds.d AND et.entity_type = 'document'
    GROUP BY ds.d
  )
  SELECT 
    dd.metric_date,
    CASE WHEN dd.total_docs > 0 
      THEN ROUND((dd.docs_with_tax::NUMERIC / dd.total_docs::NUMERIC) * 100, 2)
      ELSE 0 
    END AS coverage_percentage,
    dd.total_docs AS total_documents,
    dd.docs_with_tax AS documents_with_taxonomy,
    COALESCE(dc.class_count, 0) AS classifications_total,
    COALESCE(ROUND(dc.avg_conf, 4), 0) AS avg_confidence
  FROM daily_docs dd
  LEFT JOIN daily_classifications dc ON dc.metric_date = dd.metric_date
  ORDER BY dd.metric_date;
END;
$$;

-- ========================================
-- FUNÇÃO 2: get_taxonomy_distribution_by_domain
-- Retorna distribuição por domínio (taxonomias raiz)
-- ========================================
CREATE OR REPLACE FUNCTION public.get_taxonomy_distribution_by_domain()
RETURNS TABLE (
  domain TEXT,
  taxonomy_count BIGINT,
  document_count BIGINT,
  avg_confidence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH root_taxonomies AS (
    SELECT id, name, code
    FROM global_taxonomy
    WHERE parent_id IS NULL AND status = 'approved'
  ),
  taxonomy_tree AS (
    SELECT 
      rt.id AS root_id,
      rt.name AS root_name,
      gt.id AS taxonomy_id
    FROM root_taxonomies rt
    LEFT JOIN global_taxonomy gt ON (
      gt.id = rt.id OR 
      gt.parent_id = rt.id OR
      gt.parent_id IN (SELECT id FROM global_taxonomy WHERE parent_id = rt.id)
    )
    WHERE gt.status = 'approved'
  ),
  domain_stats AS (
    SELECT 
      tt.root_name,
      COUNT(DISTINCT tt.taxonomy_id) AS tax_count,
      COUNT(DISTINCT et.entity_id) AS doc_count,
      AVG(et.confidence) AS avg_conf
    FROM taxonomy_tree tt
    LEFT JOIN entity_tags et ON et.taxonomy_id = tt.taxonomy_id AND et.entity_type = 'document'
    GROUP BY tt.root_name
  )
  SELECT 
    ds.root_name AS domain,
    ds.tax_count AS taxonomy_count,
    ds.doc_count AS document_count,
    COALESCE(ROUND(ds.avg_conf, 4), 0) AS avg_confidence
  FROM domain_stats ds
  WHERE ds.root_name IS NOT NULL
  ORDER BY ds.doc_count DESC;
END;
$$;

-- ========================================
-- FUNÇÃO 3: get_classification_sources_stats
-- Retorna estatísticas por fonte de classificação
-- ========================================
CREATE OR REPLACE FUNCTION public.get_classification_sources_stats()
RETURNS TABLE (
  source TEXT,
  classification_count BIGINT,
  avg_confidence NUMERIC,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count BIGINT;
BEGIN
  -- Obter total para calcular percentagem
  SELECT COUNT(*) INTO total_count FROM entity_tags WHERE entity_type = 'document';
  
  RETURN QUERY
  SELECT 
    et.source,
    COUNT(*)::BIGINT AS classification_count,
    ROUND(AVG(et.confidence), 4) AS avg_confidence,
    CASE WHEN total_count > 0 
      THEN ROUND((COUNT(*)::NUMERIC / total_count::NUMERIC) * 100, 2)
      ELSE 0 
    END AS percentage
  FROM entity_tags et
  WHERE et.entity_type = 'document'
  GROUP BY et.source
  ORDER BY COUNT(*) DESC;
END;
$$;
