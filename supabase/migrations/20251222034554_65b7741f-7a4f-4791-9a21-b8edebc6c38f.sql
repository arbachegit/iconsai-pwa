-- Drop existing function first (must drop to change return type)
DROP FUNCTION IF EXISTS get_taxonomy_coverage_stats();

-- Recreate with correct implementation
CREATE OR REPLACE FUNCTION get_taxonomy_coverage_stats()
RETURNS TABLE (
  total_documents INT,
  documents_with_taxonomy INT,
  documents_without_taxonomy INT,
  coverage_percentage FLOAT,
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
  
  -- Com taxonomia (comparação UUID direta via entity_tags)
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
    CASE WHEN v_total > 0 THEN (v_with_tax::FLOAT / v_total * 100) ELSE 0 END,
    COALESCE(v_pending, 0),
    COALESCE(v_low_conf, 0);
END;
$$ LANGUAGE plpgsql;