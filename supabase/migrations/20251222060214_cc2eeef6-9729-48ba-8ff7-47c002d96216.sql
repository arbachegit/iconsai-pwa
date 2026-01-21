-- Fix approve_tag_suggestion function to use valid source value 'manual'
CREATE OR REPLACE FUNCTION public.approve_tag_suggestion(
  p_suggestion_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion record;
  v_result json;
BEGIN
  -- Get the suggestion
  SELECT * INTO v_suggestion
  FROM tag_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Suggestion not found or already processed'
    );
  END IF;
  
  -- Insert the entity_tag with source 'manual' (valid value)
  INSERT INTO entity_tags (
    entity_type,
    entity_id,
    taxonomy_id,
    source,
    confidence,
    is_primary
  )
  VALUES (
    v_suggestion.entity_type,
    v_suggestion.entity_id,
    v_suggestion.taxonomy_id,
    'manual',  -- Changed from 'admin_approved' to 'manual'
    v_suggestion.confidence,
    false
  )
  ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;
  
  -- Update the suggestion status
  UPDATE tag_suggestions
  SET status = 'approved',
      reviewed_at = now()
  WHERE id = p_suggestion_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Tag suggestion approved successfully'
  );
END;
$$;

-- Fix correct_tag_suggestion function to use valid source value 'manual'
CREATE OR REPLACE FUNCTION public.correct_tag_suggestion(
  p_suggestion_id uuid,
  p_new_taxonomy_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion record;
  v_result json;
BEGIN
  -- Get the suggestion
  SELECT * INTO v_suggestion
  FROM tag_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Suggestion not found or already processed'
    );
  END IF;
  
  -- Insert the corrected entity_tag with source 'manual' (valid value)
  INSERT INTO entity_tags (
    entity_type,
    entity_id,
    taxonomy_id,
    source,
    confidence,
    is_primary
  )
  VALUES (
    v_suggestion.entity_type,
    v_suggestion.entity_id,
    p_new_taxonomy_id,
    'manual',  -- Changed from 'admin_corrected' to 'manual'
    1.0,  -- Full confidence for manually corrected tags
    false
  )
  ON CONFLICT (entity_type, entity_id, taxonomy_id) DO NOTHING;
  
  -- Update the suggestion status
  UPDATE tag_suggestions
  SET status = 'corrected',
      corrected_taxonomy_id = p_new_taxonomy_id,
      notes = COALESCE(p_notes, notes),
      reviewed_at = now()
  WHERE id = p_suggestion_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Tag suggestion corrected successfully'
  );
END;
$$;