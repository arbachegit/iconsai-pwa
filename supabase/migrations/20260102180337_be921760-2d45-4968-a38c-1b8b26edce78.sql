-- FIX: Set search_path for upsert_deep_knowledge function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;