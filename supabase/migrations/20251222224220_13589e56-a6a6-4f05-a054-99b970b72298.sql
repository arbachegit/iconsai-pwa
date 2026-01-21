-- =====================================================
-- CORREÇÃO COMPLETA: Funcionalidade Revisão ML
-- =====================================================

-- 1. CORRIGIR CONSTRAINT para incluir 'reverted'
ALTER TABLE ml_tag_feedback DROP CONSTRAINT IF EXISTS ml_tag_feedback_feedback_type_check;
ALTER TABLE ml_tag_feedback ADD CONSTRAINT ml_tag_feedback_feedback_type_check 
  CHECK (feedback_type = ANY (ARRAY['approved'::text, 'rejected'::text, 'corrected'::text, 'reverted'::text]));

-- 2. REMOVER FUNÇÕES DUPLICADAS ANTIGAS
DROP FUNCTION IF EXISTS public.approve_tag_suggestion(uuid);
DROP FUNCTION IF EXISTS public.correct_tag_suggestion(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.reject_tag_suggestion(uuid, text);

-- 3. RECRIAR revert_tag_suggestion COM SOURCE VÁLIDO
DROP FUNCTION IF EXISTS public.revert_tag_suggestion(uuid, uuid);
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
  -- FIXED: Use source = 'manual' which is a valid value
  IF v_suggestion.status IN ('approved', 'corrected') THEN
    DELETE FROM entity_tags
    WHERE entity_id = v_suggestion.document_id
      AND entity_type = 'document'
      AND (
        taxonomy_id = v_suggestion.taxonomy_id
        OR (v_suggestion.corrected_to_taxonomy_id IS NOT NULL 
            AND taxonomy_id = v_suggestion.corrected_to_taxonomy_id)
      )
      AND source = 'manual';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  -- Revert suggestion to pending
  UPDATE ml_tag_suggestions
  SET 
    status = 'pending',
    reviewed_by = NULL,
    reviewed_at = NULL,
    corrected_to_taxonomy_id = NULL,
    reviewer_notes = COALESCE(reviewer_notes, '') || 
      CASE WHEN reviewer_notes IS NOT NULL AND reviewer_notes != '' THEN E'\n' ELSE '' END ||
      '[Revertido em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ']'
  WHERE id = p_suggestion_id;
  
  -- Log the revert action in feedback table
  INSERT INTO ml_tag_feedback (
    document_id,
    original_taxonomy_id,
    feedback_type,
    created_by,
    admin_notes
  ) VALUES (
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

-- 4. RECRIAR approve_tag_suggestion COM ESTRUTURA CORRETA
DROP FUNCTION IF EXISTS public.approve_tag_suggestion(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.approve_tag_suggestion(
  p_suggestion_id uuid,
  p_reviewer_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion RECORD;
BEGIN
  -- Get the suggestion from correct table
  SELECT * INTO v_suggestion
  FROM ml_tag_suggestions
  WHERE id = p_suggestion_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Suggestion not found'
    );
  END IF;
  
  IF v_suggestion.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Suggestion is not pending'
    );
  END IF;
  
  -- Update suggestion status
  UPDATE ml_tag_suggestions
  SET 
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    reviewer_notes = p_notes
  WHERE id = p_suggestion_id;
  
  -- Create entity_tag with valid source
  INSERT INTO entity_tags (
    entity_id,
    entity_type,
    taxonomy_id,
    source,
    confidence,
    is_primary
  ) VALUES (
    v_suggestion.document_id,
    'document',
    v_suggestion.taxonomy_id,
    'manual',
    v_suggestion.confidence,
    false
  )
  ON CONFLICT (entity_id, entity_type, taxonomy_id) DO NOTHING;
  
  -- Log feedback
  INSERT INTO ml_tag_feedback (
    document_id,
    original_taxonomy_id,
    feedback_type,
    created_by,
    admin_notes
  ) VALUES (
    v_suggestion.document_id,
    v_suggestion.taxonomy_id,
    'approved',
    p_reviewer_id,
    p_notes
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'taxonomy_id', v_suggestion.taxonomy_id
  );
END;
$$;

-- 5. RECRIAR reject_tag_suggestion COM ESTRUTURA CORRETA
DROP FUNCTION IF EXISTS public.reject_tag_suggestion(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.reject_tag_suggestion(
  p_suggestion_id uuid,
  p_reviewer_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion RECORD;
BEGIN
  -- Get the suggestion from correct table
  SELECT * INTO v_suggestion
  FROM ml_tag_suggestions
  WHERE id = p_suggestion_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Suggestion not found'
    );
  END IF;
  
  IF v_suggestion.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Suggestion is not pending'
    );
  END IF;
  
  -- Update suggestion status
  UPDATE ml_tag_suggestions
  SET 
    status = 'rejected',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    reviewer_notes = p_notes
  WHERE id = p_suggestion_id;
  
  -- Log feedback
  INSERT INTO ml_tag_feedback (
    document_id,
    original_taxonomy_id,
    feedback_type,
    created_by,
    admin_notes
  ) VALUES (
    v_suggestion.document_id,
    v_suggestion.taxonomy_id,
    'rejected',
    p_reviewer_id,
    p_notes
  );
  
  RETURN jsonb_build_object(
    'success', true
  );
END;
$$;

-- 6. RECRIAR correct_tag_suggestion COM ESTRUTURA CORRETA
DROP FUNCTION IF EXISTS public.correct_tag_suggestion(uuid, uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.correct_tag_suggestion(
  p_suggestion_id uuid,
  p_new_taxonomy_id uuid,
  p_reviewer_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion RECORD;
BEGIN
  -- Get the suggestion from correct table
  SELECT * INTO v_suggestion
  FROM ml_tag_suggestions
  WHERE id = p_suggestion_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Suggestion not found'
    );
  END IF;
  
  IF v_suggestion.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Suggestion is not pending'
    );
  END IF;
  
  -- Update suggestion with correction
  UPDATE ml_tag_suggestions
  SET 
    status = 'corrected',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    corrected_to_taxonomy_id = p_new_taxonomy_id,
    reviewer_notes = p_notes
  WHERE id = p_suggestion_id;
  
  -- Create entity_tag with corrected taxonomy and valid source
  INSERT INTO entity_tags (
    entity_id,
    entity_type,
    taxonomy_id,
    source,
    confidence,
    is_primary
  ) VALUES (
    v_suggestion.document_id,
    'document',
    p_new_taxonomy_id,
    'manual',
    v_suggestion.confidence,
    false
  )
  ON CONFLICT (entity_id, entity_type, taxonomy_id) DO NOTHING;
  
  -- Log feedback with correction details
  INSERT INTO ml_tag_feedback (
    document_id,
    original_taxonomy_id,
    corrected_taxonomy_id,
    feedback_type,
    created_by,
    admin_notes
  ) VALUES (
    v_suggestion.document_id,
    v_suggestion.taxonomy_id,
    p_new_taxonomy_id,
    'corrected',
    p_reviewer_id,
    p_notes
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'original_taxonomy_id', v_suggestion.taxonomy_id,
    'corrected_taxonomy_id', p_new_taxonomy_id
  );
END;
$$;