-- ==========================================
-- FASE 3: ML BIDIRECIONAL - CORRELAÇÕES E RESTRIÇÕES
-- ==========================================

-- 1. Tabela de CORRELAÇÕES (padrões positivos aprendidos)
CREATE TABLE IF NOT EXISTS public.ml_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  taxonomy_code TEXT NOT NULL,
  taxonomy_id UUID REFERENCES public.global_taxonomy(id) ON DELETE CASCADE,
  correlation_strength FLOAT NOT NULL DEFAULT 0.5 CHECK (correlation_strength >= 0 AND correlation_strength <= 1),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'feedback' CHECK (source IN ('feedback', 'manual', 'correction')),
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(keyword, taxonomy_code)
);

-- 2. Tabela de RESTRIÇÕES (padrões negativos aprendidos)
CREATE TABLE IF NOT EXISTS public.ml_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  restricted_taxonomy_code TEXT NOT NULL,
  restricted_taxonomy_id UUID REFERENCES public.global_taxonomy(id) ON DELETE CASCADE,
  restriction_strength FLOAT NOT NULL DEFAULT 0.5 CHECK (restriction_strength >= 0 AND restriction_strength <= 1),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'feedback' CHECK (source IN ('feedback', 'manual', 'correction')),
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(keyword, restricted_taxonomy_code)
);

-- 3. Enable RLS
ALTER TABLE public.ml_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_restrictions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for ml_correlations
CREATE POLICY "Admins can manage ml_correlations" ON public.ml_correlations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Public can read ml_correlations" ON public.ml_correlations
  FOR SELECT USING (true);

CREATE POLICY "System can insert ml_correlations" ON public.ml_correlations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update ml_correlations" ON public.ml_correlations
  FOR UPDATE USING (true);

-- 5. RLS Policies for ml_restrictions
CREATE POLICY "Admins can manage ml_restrictions" ON public.ml_restrictions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Public can read ml_restrictions" ON public.ml_restrictions
  FOR SELECT USING (true);

CREATE POLICY "System can insert ml_restrictions" ON public.ml_restrictions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update ml_restrictions" ON public.ml_restrictions
  FOR UPDATE USING (true);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_correlations_keyword ON public.ml_correlations(keyword);
CREATE INDEX IF NOT EXISTS idx_ml_correlations_taxonomy_code ON public.ml_correlations(taxonomy_code);
CREATE INDEX IF NOT EXISTS idx_ml_correlations_strength ON public.ml_correlations(correlation_strength DESC);

CREATE INDEX IF NOT EXISTS idx_ml_restrictions_keyword ON public.ml_restrictions(keyword);
CREATE INDEX IF NOT EXISTS idx_ml_restrictions_taxonomy_code ON public.ml_restrictions(restricted_taxonomy_code);
CREATE INDEX IF NOT EXISTS idx_ml_restrictions_strength ON public.ml_restrictions(restriction_strength DESC);

-- 7. Updated_at trigger for ml_correlations
CREATE OR REPLACE FUNCTION public.update_ml_correlations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_ml_correlations_timestamp
  BEFORE UPDATE ON public.ml_correlations
  FOR EACH ROW EXECUTE FUNCTION public.update_ml_correlations_updated_at();

-- 8. Updated_at trigger for ml_restrictions
CREATE OR REPLACE FUNCTION public.update_ml_restrictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_ml_restrictions_timestamp
  BEFORE UPDATE ON public.ml_restrictions
  FOR EACH ROW EXECUTE FUNCTION public.update_ml_restrictions_updated_at();

-- 9. Function to extract keywords from text (for learning)
CREATE OR REPLACE FUNCTION public.extract_keywords_from_text(p_text TEXT, p_limit INTEGER DEFAULT 20)
RETURNS TEXT[] AS $$
DECLARE
  v_words TEXT[];
  v_stopwords TEXT[] := ARRAY['a', 'o', 'e', 'de', 'da', 'do', 'em', 'para', 'com', 'por', 'que', 'uma', 'um', 'os', 'as', 'no', 'na', 'ao', 'ou', 'se', 'é', 'são', 'foi', 'ser', 'ter', 'como', 'mais', 'sua', 'seu', 'the', 'and', 'of', 'to', 'in', 'is', 'for', 'on', 'with', 'that', 'by', 'this', 'from', 'at', 'an'];
  v_result TEXT[];
BEGIN
  -- Normalize and split text into words
  v_words := regexp_split_to_array(lower(regexp_replace(p_text, '[^a-zA-ZÀ-ÿ\s]', ' ', 'g')), '\s+');
  
  -- Filter: remove stopwords and words shorter than 3 chars
  SELECT ARRAY_AGG(DISTINCT w) INTO v_result
  FROM (
    SELECT unnest(v_words) AS w
  ) sub
  WHERE length(w) >= 3 
    AND w != ''
    AND NOT (w = ANY(v_stopwords));
  
  -- Return limited result
  RETURN v_result[1:p_limit];
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- 10. Function to learn correlation from approval
CREATE OR REPLACE FUNCTION public.learn_correlation_from_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_document_text TEXT;
  v_keywords TEXT[];
  v_taxonomy_code TEXT;
  v_taxonomy_id UUID;
  v_kw TEXT;
BEGIN
  -- Only process approved feedback
  IF NEW.feedback_type != 'approved' THEN
    RETURN NEW;
  END IF;
  
  -- Get document text
  SELECT COALESCE(text_preview, original_text) INTO v_document_text
  FROM public.documents
  WHERE id = NEW.document_id;
  
  IF v_document_text IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get taxonomy info
  SELECT code, id INTO v_taxonomy_code, v_taxonomy_id
  FROM public.global_taxonomy
  WHERE id = NEW.original_taxonomy_id;
  
  IF v_taxonomy_code IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Extract keywords
  v_keywords := extract_keywords_from_text(v_document_text, 15);
  
  -- Create/update correlations for each keyword
  FOREACH v_kw IN ARRAY v_keywords LOOP
    INSERT INTO public.ml_correlations (keyword, taxonomy_code, taxonomy_id, source, last_validated_at)
    VALUES (v_kw, v_taxonomy_code, v_taxonomy_id, 'feedback', NOW())
    ON CONFLICT (keyword, taxonomy_code) DO UPDATE SET
      occurrence_count = ml_correlations.occurrence_count + 1,
      correlation_strength = LEAST(0.95, ml_correlations.correlation_strength + 0.05),
      last_validated_at = NOW(),
      updated_at = NOW();
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Function to learn restriction from rejection
CREATE OR REPLACE FUNCTION public.learn_restriction_from_rejection()
RETURNS TRIGGER AS $$
DECLARE
  v_document_text TEXT;
  v_keywords TEXT[];
  v_taxonomy_code TEXT;
  v_taxonomy_id UUID;
  v_kw TEXT;
BEGIN
  -- Only process rejected feedback
  IF NEW.feedback_type != 'rejected' THEN
    RETURN NEW;
  END IF;
  
  -- Get document text
  SELECT COALESCE(text_preview, original_text) INTO v_document_text
  FROM public.documents
  WHERE id = NEW.document_id;
  
  IF v_document_text IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get taxonomy info
  SELECT code, id INTO v_taxonomy_code, v_taxonomy_id
  FROM public.global_taxonomy
  WHERE id = NEW.original_taxonomy_id;
  
  IF v_taxonomy_code IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Extract keywords
  v_keywords := extract_keywords_from_text(v_document_text, 15);
  
  -- Create/update restrictions for each keyword
  FOREACH v_kw IN ARRAY v_keywords LOOP
    INSERT INTO public.ml_restrictions (keyword, restricted_taxonomy_code, restricted_taxonomy_id, source, last_validated_at)
    VALUES (v_kw, v_taxonomy_code, v_taxonomy_id, 'feedback', NOW())
    ON CONFLICT (keyword, restricted_taxonomy_code) DO UPDATE SET
      occurrence_count = ml_restrictions.occurrence_count + 1,
      restriction_strength = LEAST(0.95, ml_restrictions.restriction_strength + 0.05),
      last_validated_at = NOW(),
      updated_at = NOW();
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Function to learn from correction (both correlation and restriction)
CREATE OR REPLACE FUNCTION public.learn_from_correction()
RETURNS TRIGGER AS $$
DECLARE
  v_document_text TEXT;
  v_keywords TEXT[];
  v_original_code TEXT;
  v_original_id UUID;
  v_corrected_code TEXT;
  v_corrected_id UUID;
  v_kw TEXT;
BEGIN
  -- Only process corrected feedback
  IF NEW.feedback_type != 'corrected' THEN
    RETURN NEW;
  END IF;
  
  -- Need both original and corrected
  IF NEW.original_taxonomy_id IS NULL OR NEW.corrected_taxonomy_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get document text
  SELECT COALESCE(text_preview, original_text) INTO v_document_text
  FROM public.documents
  WHERE id = NEW.document_id;
  
  IF v_document_text IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get original taxonomy info
  SELECT code, id INTO v_original_code, v_original_id
  FROM public.global_taxonomy
  WHERE id = NEW.original_taxonomy_id;
  
  -- Get corrected taxonomy info
  SELECT code, id INTO v_corrected_code, v_corrected_id
  FROM public.global_taxonomy
  WHERE id = NEW.corrected_taxonomy_id;
  
  -- Extract keywords
  v_keywords := extract_keywords_from_text(v_document_text, 15);
  
  FOREACH v_kw IN ARRAY v_keywords LOOP
    -- Create RESTRICTION for original (wrong) code
    IF v_original_code IS NOT NULL THEN
      INSERT INTO public.ml_restrictions (keyword, restricted_taxonomy_code, restricted_taxonomy_id, source, last_validated_at)
      VALUES (v_kw, v_original_code, v_original_id, 'correction', NOW())
      ON CONFLICT (keyword, restricted_taxonomy_code) DO UPDATE SET
        occurrence_count = ml_restrictions.occurrence_count + 1,
        restriction_strength = LEAST(0.95, ml_restrictions.restriction_strength + 0.08),
        last_validated_at = NOW(),
        updated_at = NOW();
    END IF;
    
    -- Create CORRELATION for corrected (right) code
    IF v_corrected_code IS NOT NULL THEN
      INSERT INTO public.ml_correlations (keyword, taxonomy_code, taxonomy_id, source, last_validated_at)
      VALUES (v_kw, v_corrected_code, v_corrected_id, 'correction', NOW())
      ON CONFLICT (keyword, taxonomy_code) DO UPDATE SET
        occurrence_count = ml_correlations.occurrence_count + 1,
        correlation_strength = LEAST(0.95, ml_correlations.correlation_strength + 0.08),
        last_validated_at = NOW(),
        updated_at = NOW();
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 13. Create triggers on ml_tag_feedback
CREATE TRIGGER trigger_learn_correlation_on_approval
  AFTER INSERT ON public.ml_tag_feedback
  FOR EACH ROW
  WHEN (NEW.feedback_type = 'approved')
  EXECUTE FUNCTION public.learn_correlation_from_approval();

CREATE TRIGGER trigger_learn_restriction_on_rejection
  AFTER INSERT ON public.ml_tag_feedback
  FOR EACH ROW
  WHEN (NEW.feedback_type = 'rejected')
  EXECUTE FUNCTION public.learn_restriction_from_rejection();

CREATE TRIGGER trigger_learn_from_correction
  AFTER INSERT ON public.ml_tag_feedback
  FOR EACH ROW
  WHEN (NEW.feedback_type = 'corrected')
  EXECUTE FUNCTION public.learn_from_correction();

-- 14. Function to get learned patterns for a set of keywords (for use in AI)
CREATE OR REPLACE FUNCTION public.get_learned_patterns(p_keywords TEXT[])
RETURNS TABLE (
  pattern_type TEXT,
  keyword TEXT,
  taxonomy_code TEXT,
  strength FLOAT,
  occurrences INTEGER
) AS $$
BEGIN
  -- Return correlations
  RETURN QUERY
  SELECT 
    'correlation'::TEXT as pattern_type,
    c.keyword,
    c.taxonomy_code,
    c.correlation_strength as strength,
    c.occurrence_count as occurrences
  FROM public.ml_correlations c
  WHERE c.keyword = ANY(p_keywords)
    AND c.correlation_strength >= 0.5
    AND c.occurrence_count >= 2
  ORDER BY c.correlation_strength DESC, c.occurrence_count DESC
  LIMIT 20;
  
  -- Return restrictions
  RETURN QUERY
  SELECT 
    'restriction'::TEXT as pattern_type,
    r.keyword,
    r.restricted_taxonomy_code as taxonomy_code,
    r.restriction_strength as strength,
    r.occurrence_count as occurrences
  FROM public.ml_restrictions r
  WHERE r.keyword = ANY(p_keywords)
    AND r.restriction_strength >= 0.5
    AND r.occurrence_count >= 2
  ORDER BY r.restriction_strength DESC, r.occurrence_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;