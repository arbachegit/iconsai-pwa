-- ============================================
-- FIX DEFINITIVO: entity_tags_source_check violation
-- Corrigir as funções approve_tag_suggestion e correct_tag_suggestion
-- para usar 'manual' ao invés de 'admin_approved'/'admin_corrected'
-- ============================================

-- 1) Corrigir approve_tag_suggestion (overload com 2 argumentos)
CREATE OR REPLACE FUNCTION public.approve_tag_suggestion(
  p_suggestion_id uuid,
  p_reviewer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_suggestion RECORD;
  v_entity_tag_id UUID;
BEGIN
  -- Buscar sugestão
  SELECT * INTO v_suggestion
  FROM public.ml_tag_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sugestão não encontrada ou já processada');
  END IF;
  
  -- Inserir em entity_tags com source='manual' (valor válido na constraint)
  INSERT INTO public.entity_tags (
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
    'manual',  -- CORRIGIDO: era 'admin_approved'
    v_suggestion.confidence,
    false
  )
  ON CONFLICT (entity_id, entity_type, taxonomy_id) DO UPDATE
  SET confidence = EXCLUDED.confidence,
      source = 'manual'
  RETURNING id INTO v_entity_tag_id;
  
  -- Atualizar status da sugestão
  UPDATE public.ml_tag_suggestions
  SET status = 'approved',
      reviewed_at = NOW(),
      reviewed_by = p_reviewer_id
  WHERE id = p_suggestion_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'entity_tag_id', v_entity_tag_id,
    'message', 'Sugestão aprovada com sucesso'
  );
END;
$function$;

-- 2) Corrigir correct_tag_suggestion (overload com 4 argumentos)
CREATE OR REPLACE FUNCTION public.correct_tag_suggestion(
  p_suggestion_id uuid,
  p_correct_taxonomy_id uuid,
  p_reviewer_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_suggestion RECORD;
  v_entity_tag_id UUID;
BEGIN
  -- Buscar sugestão
  SELECT * INTO v_suggestion
  FROM public.ml_tag_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sugestão não encontrada ou já processada');
  END IF;
  
  -- Inserir em entity_tags com a taxonomia correta e source='manual'
  INSERT INTO public.entity_tags (
    entity_id,
    entity_type,
    taxonomy_id,
    source,
    confidence,
    is_primary
  ) VALUES (
    v_suggestion.document_id,
    'document',
    p_correct_taxonomy_id,
    'manual',  -- CORRIGIDO: era 'admin_corrected'
    1.0,
    false
  )
  ON CONFLICT (entity_id, entity_type, taxonomy_id) DO UPDATE
  SET confidence = 1.0,
      source = 'manual'
  RETURNING id INTO v_entity_tag_id;
  
  -- Atualizar status da sugestão
  UPDATE public.ml_tag_suggestions
  SET status = 'corrected',
      reviewed_at = NOW(),
      reviewed_by = p_reviewer_id,
      notes = COALESCE(p_notes, notes),
      corrected_taxonomy_id = p_correct_taxonomy_id
  WHERE id = p_suggestion_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'entity_tag_id', v_entity_tag_id,
    'original_taxonomy_id', v_suggestion.taxonomy_id,
    'corrected_taxonomy_id', p_correct_taxonomy_id,
    'message', 'Sugestão corrigida com sucesso'
  );
END;
$function$;