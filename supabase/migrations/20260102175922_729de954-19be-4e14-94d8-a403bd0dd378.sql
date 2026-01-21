-- =============================================
-- CORREÇÕES SQL - KnowYOU DataFlow
-- Data: 02/01/2026
-- =============================================

-- 1. ADICIONAR COLUNA QUERY_HASH
ALTER TABLE deep_search_knowledge 
ADD COLUMN IF NOT EXISTS query_hash TEXT;

-- 2. POPULAR DADOS EXISTENTES
UPDATE deep_search_knowledge 
SET query_hash = md5(lower(trim(query)))
WHERE query_hash IS NULL;

-- 3. CRIAR ÍNDICE ÚNICO
CREATE UNIQUE INDEX IF NOT EXISTS idx_deep_search_query_hash 
ON deep_search_knowledge(query_hash);

-- 4. CRIAR FUNÇÃO UPSERT_DEEP_KNOWLEDGE
CREATE OR REPLACE FUNCTION upsert_deep_knowledge(
  p_query TEXT,
  p_answer TEXT,
  p_source_url TEXT DEFAULT NULL,
  p_source_name TEXT DEFAULT 'AI',
  p_source_type TEXT DEFAULT 'ai',
  p_embedding vector(1536) DEFAULT NULL,
  p_auto_tags TEXT[] DEFAULT '{}',
  p_primary_slug TEXT DEFAULT NULL,
  p_confidence FLOAT DEFAULT 0.7
)
RETURNS UUID AS $$
DECLARE
  v_hash TEXT;
  v_id UUID;
BEGIN
  v_hash := md5(lower(trim(p_query)));
  
  INSERT INTO deep_search_knowledge (
    query_hash, query, answer, source_url, source_name, 
    source_type, embedding, auto_tags, primary_slug, confidence
  )
  VALUES (
    v_hash, p_query, p_answer, p_source_url, p_source_name,
    p_source_type, p_embedding, p_auto_tags, p_primary_slug, p_confidence
  )
  ON CONFLICT (query_hash) DO UPDATE SET
    answer = EXCLUDED.answer,
    source_url = COALESCE(EXCLUDED.source_url, deep_search_knowledge.source_url),
    source_name = EXCLUDED.source_name,
    source_type = EXCLUDED.source_type,
    embedding = COALESCE(EXCLUDED.embedding, deep_search_knowledge.embedding),
    auto_tags = EXCLUDED.auto_tags,
    primary_slug = EXCLUDED.primary_slug,
    confidence = GREATEST(EXCLUDED.confidence, deep_search_knowledge.confidence),
    usage_count = deep_search_knowledge.usage_count + 1,
    last_used_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. AJUSTAR POLICY INSERT crm_visits
DROP POLICY IF EXISTS "Public can insert crm visits" ON crm_visits;

CREATE POLICY "Salesman can insert own visits" ON crm_visits
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR
    salesman_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  );

-- 6. AJUSTAR POLICY UPDATE deep_search_knowledge
DROP POLICY IF EXISTS "Admins can update knowledge" ON deep_search_knowledge;

CREATE POLICY "Admins can update knowledge" ON deep_search_knowledge
  FOR UPDATE USING (
    auth.uid() IS NULL OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  );