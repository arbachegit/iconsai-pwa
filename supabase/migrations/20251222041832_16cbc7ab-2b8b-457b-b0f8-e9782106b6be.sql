-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS get_documents_for_reclassification(text, integer, integer);
DROP FUNCTION IF EXISTS get_taxonomy_coverage_stats();

-- 1. Recreate get_documents_for_reclassification with explicit table qualifiers to fix ambiguity
CREATE OR REPLACE FUNCTION get_documents_for_reclassification(
  p_filter text,
  p_limit integer,
  p_offset integer
) RETURNS TABLE (
  document_id uuid,
  filename text,
  target_chat text,
  ai_summary text,
  text_preview text,
  created_at timestamptz,
  current_taxonomies jsonb,
  tag_count integer,
  avg_confidence numeric,
  has_pending_tag boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH doc_taxonomies AS (
    SELECT 
      et.entity_id as doc_uuid,
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
  pending_legacy AS (
    SELECT DISTINCT dt.document_id as doc_uuid
    FROM document_tags dt
    WHERE dt.tag_name LIKE '%pendente%' OR dt.tag_name LIKE '%classificacao%'
  )
  SELECT 
    docs.id AS document_id,
    docs.filename AS filename,
    docs.target_chat AS target_chat,
    docs.ai_summary AS ai_summary,
    docs.text_preview AS text_preview,
    docs.created_at AS created_at,
    COALESCE(dtax.taxonomies, '[]'::jsonb) AS current_taxonomies,
    COALESCE(dtax.cnt, 0) AS tag_count,
    COALESCE(ROUND(dtax.avg_conf, 2), 0) AS avg_confidence,
    (pleg.doc_uuid IS NOT NULL) AS has_pending_tag
  FROM documents docs
  LEFT JOIN doc_taxonomies dtax ON dtax.doc_uuid = docs.id
  LEFT JOIN pending_legacy pleg ON pleg.doc_uuid = docs.id
  WHERE docs.status = 'completed'
    AND (
      CASE p_filter
        WHEN 'no_taxonomy' THEN dtax.doc_uuid IS NULL
        WHEN 'pending_classification' THEN pleg.doc_uuid IS NOT NULL
        WHEN 'low_confidence' THEN dtax.avg_conf < 0.7
        WHEN 'all' THEN TRUE
        ELSE TRUE
      END
    )
  ORDER BY docs.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Recreate get_taxonomy_coverage_stats with NUMERIC(5,2) for 2 decimal places
CREATE OR REPLACE FUNCTION get_taxonomy_coverage_stats()
RETURNS TABLE (
  total_documents INT,
  documents_with_taxonomy INT,
  documents_without_taxonomy INT,
  coverage_percentage NUMERIC(5,2),
  pending_classification INT,
  low_confidence_count INT
) AS $$
DECLARE
  v_total INT;
  v_with_tax INT;
  v_without_tax INT;
  v_pending INT;
  v_low_conf INT;
BEGIN
  -- Total de documentos completos
  SELECT COUNT(*) INTO v_total
  FROM documents
  WHERE status = 'completed' AND is_readable = true;
  
  -- Com taxonomia (entity_tags)
  SELECT COUNT(DISTINCT et.entity_id) INTO v_with_tax
  FROM entity_tags et
  WHERE et.entity_type = 'document';
  
  v_without_tax := v_total - v_with_tax;
  
  -- Com tag pendente
  SELECT COUNT(DISTINCT et.entity_id) INTO v_pending
  FROM entity_tags et
  JOIN global_taxonomy gt ON gt.id = et.taxonomy_id
  WHERE et.entity_type = 'document'
    AND gt.code LIKE '_pendente%';
  
  -- Com baixa confiança
  SELECT COUNT(DISTINCT et.entity_id) INTO v_low_conf
  FROM entity_tags et
  WHERE et.entity_type = 'document'
    AND et.confidence < 0.7;
  
  RETURN QUERY SELECT 
    v_total,
    v_with_tax,
    v_without_tax,
    ROUND(CASE WHEN v_total > 0 THEN (v_with_tax::NUMERIC / v_total * 100) ELSE 0 END, 2)::NUMERIC(5,2),
    COALESCE(v_pending, 0),
    COALESCE(v_low_conf, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;