-- =====================================================
-- FASE 2: ML Tag Suggestions and Feedback Tables
-- =====================================================

-- 1. Table for AI-generated tag suggestions pending review
CREATE TABLE IF NOT EXISTS public.ml_tag_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  taxonomy_id UUID NOT NULL REFERENCES public.global_taxonomy(id) ON DELETE CASCADE,
  suggested_code TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  source TEXT NOT NULL DEFAULT 'ai_suggestion',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'corrected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  corrected_to_taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table for ML feedback loop (learning from admin corrections)
CREATE TABLE IF NOT EXISTS public.ml_tag_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  original_taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  original_code TEXT,
  corrected_taxonomy_id UUID REFERENCES public.global_taxonomy(id),
  corrected_code TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('approved', 'rejected', 'corrected')),
  confidence_before FLOAT,
  confidence_after FLOAT,
  admin_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_suggestions_status ON public.ml_tag_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ml_suggestions_document ON public.ml_tag_suggestions(document_id);
CREATE INDEX IF NOT EXISTS idx_ml_suggestions_taxonomy ON public.ml_tag_suggestions(taxonomy_id);
CREATE INDEX IF NOT EXISTS idx_ml_suggestions_created ON public.ml_tag_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_document ON public.ml_tag_feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_type ON public.ml_tag_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_created ON public.ml_tag_feedback(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.ml_tag_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_tag_feedback ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for ml_tag_suggestions
CREATE POLICY "Admins can manage ml_tag_suggestions"
  ON public.ml_tag_suggestions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert ml_tag_suggestions"
  ON public.ml_tag_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read pending suggestions count"
  ON public.ml_tag_suggestions FOR SELECT
  USING (true);

-- 6. RLS Policies for ml_tag_feedback
CREATE POLICY "Admins can manage ml_tag_feedback"
  ON public.ml_tag_feedback FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert ml_tag_feedback"
  ON public.ml_tag_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read ml_tag_feedback"
  ON public.ml_tag_feedback FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- 7. Function to approve a tag suggestion
CREATE OR REPLACE FUNCTION public.approve_tag_suggestion(
  p_suggestion_id UUID,
  p_reviewer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_suggestion RECORD;
  v_entity_id UUID;
BEGIN
  -- Get suggestion details
  SELECT * INTO v_suggestion
  FROM public.ml_tag_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Suggestion not found or already processed');
  END IF;
  
  -- Create entity_tag entry
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
    'admin_approved',
    v_suggestion.confidence,
    false
  )
  ON CONFLICT (entity_id, entity_type, taxonomy_id) DO NOTHING
  RETURNING id INTO v_entity_id;
  
  -- Update suggestion status
  UPDATE public.ml_tag_suggestions
  SET 
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW()
  WHERE id = p_suggestion_id;
  
  -- Log feedback for ML learning
  INSERT INTO public.ml_tag_feedback (
    document_id,
    original_taxonomy_id,
    original_code,
    feedback_type,
    confidence_before,
    created_by
  ) VALUES (
    v_suggestion.document_id,
    v_suggestion.taxonomy_id,
    v_suggestion.suggested_code,
    'approved',
    v_suggestion.confidence,
    p_reviewer_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'entity_tag_id', v_entity_id,
    'taxonomy_id', v_suggestion.taxonomy_id
  );
END;
$$;

-- 8. Function to reject a tag suggestion
CREATE OR REPLACE FUNCTION public.reject_tag_suggestion(
  p_suggestion_id UUID,
  p_reviewer_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_suggestion RECORD;
BEGIN
  -- Get suggestion details
  SELECT * INTO v_suggestion
  FROM public.ml_tag_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Suggestion not found or already processed');
  END IF;
  
  -- Update suggestion status
  UPDATE public.ml_tag_suggestions
  SET 
    status = 'rejected',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    reviewer_notes = p_notes
  WHERE id = p_suggestion_id;
  
  -- Log feedback for ML learning
  INSERT INTO public.ml_tag_feedback (
    document_id,
    original_taxonomy_id,
    original_code,
    feedback_type,
    confidence_before,
    admin_notes,
    created_by
  ) VALUES (
    v_suggestion.document_id,
    v_suggestion.taxonomy_id,
    v_suggestion.suggested_code,
    'rejected',
    v_suggestion.confidence,
    p_notes,
    p_reviewer_id
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Function to correct a tag suggestion
CREATE OR REPLACE FUNCTION public.correct_tag_suggestion(
  p_suggestion_id UUID,
  p_correct_taxonomy_id UUID,
  p_reviewer_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_suggestion RECORD;
  v_correct_taxonomy RECORD;
  v_entity_id UUID;
BEGIN
  -- Get suggestion details
  SELECT * INTO v_suggestion
  FROM public.ml_tag_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Suggestion not found or already processed');
  END IF;
  
  -- Get correct taxonomy details
  SELECT * INTO v_correct_taxonomy
  FROM public.global_taxonomy
  WHERE id = p_correct_taxonomy_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correct taxonomy not found');
  END IF;
  
  -- Create entity_tag with corrected taxonomy
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
    'admin_corrected',
    1.0,
    false
  )
  ON CONFLICT (entity_id, entity_type, taxonomy_id) DO NOTHING
  RETURNING id INTO v_entity_id;
  
  -- Update suggestion status
  UPDATE public.ml_tag_suggestions
  SET 
    status = 'corrected',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    reviewer_notes = p_notes,
    corrected_to_taxonomy_id = p_correct_taxonomy_id
  WHERE id = p_suggestion_id;
  
  -- Log feedback for ML learning
  INSERT INTO public.ml_tag_feedback (
    document_id,
    original_taxonomy_id,
    original_code,
    corrected_taxonomy_id,
    corrected_code,
    feedback_type,
    confidence_before,
    confidence_after,
    admin_notes,
    created_by
  ) VALUES (
    v_suggestion.document_id,
    v_suggestion.taxonomy_id,
    v_suggestion.suggested_code,
    p_correct_taxonomy_id,
    v_correct_taxonomy.code,
    'corrected',
    v_suggestion.confidence,
    1.0,
    p_notes,
    p_reviewer_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'entity_tag_id', v_entity_id,
    'corrected_to', v_correct_taxonomy.code
  );
END;
$$;

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.approve_tag_suggestion(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_tag_suggestion(UUID, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.correct_tag_suggestion(UUID, UUID, UUID, TEXT) TO anon, authenticated, service_role;

-- 11. Function to get ML suggestion statistics
CREATE OR REPLACE FUNCTION public.get_ml_suggestion_stats()
RETURNS TABLE (
  total_suggestions BIGINT,
  pending_count BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  corrected_count BIGINT,
  approval_rate NUMERIC,
  avg_confidence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_suggestions,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_count,
    COUNT(*) FILTER (WHERE status = 'corrected')::BIGINT as corrected_count,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status != 'pending') > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status = 'approved')::NUMERIC / 
         COUNT(*) FILTER (WHERE status != 'pending')::NUMERIC) * 100, 
        2
      )
      ELSE 0
    END as approval_rate,
    ROUND(AVG(confidence)::NUMERIC, 3) as avg_confidence
  FROM public.ml_tag_suggestions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ml_suggestion_stats() TO anon, authenticated, service_role;