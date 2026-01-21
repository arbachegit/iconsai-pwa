-- =====================================================
-- CORREÇÃO: apply_batch_taxonomy + View v_document_taxonomies
-- =====================================================

-- 1. CORRIGIR A FUNÇÃO apply_batch_taxonomy (remove ::TEXT desnecessário)
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
        
        -- Insere ou atualiza entity_tag (CORRIGIDO: sem ::TEXT)
        INSERT INTO entity_tags (entity_id, entity_type, taxonomy_id, source, confidence)
        VALUES (v_doc_id, 'document', v_taxonomy_id, v_source, v_confidence)
        ON CONFLICT (entity_type, entity_id, taxonomy_id) 
        DO UPDATE SET 
          confidence = GREATEST(entity_tags.confidence, EXCLUDED.confidence),
          source = CASE 
            WHEN EXCLUDED.confidence > entity_tags.confidence THEN EXCLUDED.source 
            ELSE entity_tags.source 
          END;
        
        v_success := v_success + 1;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_error_list := v_error_list || jsonb_build_object(
        'document_id', v_item->>'document_id',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_success, v_errors, v_error_list;
END;
$$;

-- 2. CRIAR VIEW PARA FACILITAR CONSULTA DE DOCUMENTOS COM TAXONOMIAS
CREATE OR REPLACE VIEW v_document_taxonomies AS
SELECT 
  d.id as document_id,
  d.filename,
  d.target_chat,
  d.status,
  et.id as entity_tag_id,
  gt.code as taxonomy_code,
  gt.name as taxonomy_name,
  gt.level as taxonomy_level,
  et.confidence,
  et.source,
  et.created_at as tagged_at
FROM documents d
LEFT JOIN entity_tags et ON et.entity_id = d.id AND et.entity_type = 'document'
LEFT JOIN global_taxonomy gt ON gt.id = et.taxonomy_id;