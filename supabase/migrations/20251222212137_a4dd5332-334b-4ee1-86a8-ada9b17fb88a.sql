-- Create RPC function to revert tag suggestions back to pending
CREATE OR REPLACE FUNCTION public.revert_tag_suggestion(
  p_suggestion_id uuid,
  p_reviewer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion RECORD;
  v_deleted_count integer := 0;
BEGIN
  -- Get the suggestion
  SELECT * INTO v_suggestion
  FROM ml_tag_suggestions
  WHERE id = p_suggestion_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Suggestion not found'
    );
  END IF;
  
  -- Check if already pending
  IF v_suggestion.status = 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Suggestion is already pending'
    );
  END IF;
  
  -- If it was approved or corrected, remove the entity_tag that was created
  IF v_suggestion.status IN ('approved', 'corrected') THEN
    DELETE FROM entity_tags
    WHERE entity_id = v_suggestion.document_id
      AND entity_type = 'document'
      AND (
        taxonomy_id = v_suggestion.taxonomy_id
        OR (v_suggestion.corrected_to_taxonomy_id IS NOT NULL 
            AND taxonomy_id = v_suggestion.corrected_to_taxonomy_id)
      )
      AND source IN ('ml_approved', 'ml_corrected');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  -- Revert suggestion to pending
  UPDATE ml_tag_suggestions
  SET 
    status = 'pending',
    reviewed_by = NULL,
    reviewed_at = NULL,
    corrected_to_taxonomy_id = NULL,
    admin_notes = COALESCE(admin_notes, '') || 
      CASE WHEN admin_notes IS NOT NULL AND admin_notes != '' THEN E'\n' ELSE '' END ||
      '[Revertido em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ']'
  WHERE id = p_suggestion_id;
  
  -- Log the revert action in feedback table
  INSERT INTO ml_tag_feedback (
    suggestion_id,
    document_id,
    original_taxonomy_id,
    action,
    admin_id,
    admin_notes
  ) VALUES (
    p_suggestion_id,
    v_suggestion.document_id,
    v_suggestion.taxonomy_id,
    'reverted',
    p_reviewer_id,
    'Revertido de ' || v_suggestion.status || ' para pendente'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_suggestion.status,
    'entity_tags_removed', v_deleted_count
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.revert_tag_suggestion(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_tag_suggestion(uuid, uuid) TO service_role;