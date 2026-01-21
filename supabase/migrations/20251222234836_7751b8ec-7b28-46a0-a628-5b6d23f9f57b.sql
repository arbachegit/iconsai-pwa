-- Criar função para normalização futura de nomes de documentos
CREATE OR REPLACE FUNCTION normalize_document_names()
RETURNS TABLE(updated_count integer) AS $$
DECLARE
  count_val integer;
BEGIN
  UPDATE documents 
  SET 
    original_title = CASE 
      WHEN original_title IS NULL THEN filename 
      ELSE original_title 
    END,
    filename = ai_title,
    title_was_renamed = true,
    renamed_at = NOW(),
    rename_reason = 'bulk_rename'
  WHERE ai_title IS NOT NULL 
  AND filename != ai_title
  AND (rename_reason IS NULL OR rename_reason NOT IN ('manual_edit', 'approved_ai_suggestion'));
  
  GET DIAGNOSTICS count_val = ROW_COUNT;
  
  RETURN QUERY SELECT count_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;