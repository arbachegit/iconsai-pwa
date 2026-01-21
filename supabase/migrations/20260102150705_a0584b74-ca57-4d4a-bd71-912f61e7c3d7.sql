-- =============================================
-- MIGRATION: DataFlow Enhancement - Columns, Tables, Functions, Views
-- =============================================

-- Phase 1: Add missing columns to crm_visits
ALTER TABLE crm_visits 
ADD COLUMN IF NOT EXISTS interactions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS audio_transcript TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Phase 2: Create deep_search_knowledge table
CREATE TABLE IF NOT EXISTS deep_search_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT,
  source_type TEXT DEFAULT 'web' CHECK (source_type IN ('gov', 'academic', 'news', 'institutional', 'web', 'ai')),
  embedding vector(1536),
  auto_tags TEXT[] DEFAULT '{}',
  primary_slug TEXT,
  confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  verified BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for deep_search_knowledge
CREATE INDEX IF NOT EXISTS idx_deep_search_embedding 
  ON deep_search_knowledge 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_deep_search_tags 
  ON deep_search_knowledge USING GIN(auto_tags);

CREATE INDEX IF NOT EXISTS idx_deep_search_slug 
  ON deep_search_knowledge(primary_slug);

CREATE INDEX IF NOT EXISTS idx_deep_search_source_type 
  ON deep_search_knowledge(source_type);

CREATE INDEX IF NOT EXISTS idx_deep_search_verified 
  ON deep_search_knowledge(verified);

CREATE INDEX IF NOT EXISTS idx_deep_search_usage 
  ON deep_search_knowledge(usage_count DESC);

-- RLS for deep_search_knowledge
ALTER TABLE deep_search_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read knowledge" ON deep_search_knowledge
  FOR SELECT USING (true);

CREATE POLICY "Service can insert knowledge" ON deep_search_knowledge
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update knowledge" ON deep_search_knowledge
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Admins can delete knowledge" ON deep_search_knowledge
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'superadmin'::app_role)
  );

-- Phase 3: Create helper functions

-- Function: search_deep_knowledge
CREATE OR REPLACE FUNCTION search_deep_knowledge(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  query TEXT,
  answer TEXT,
  source_name TEXT,
  source_type TEXT,
  confidence FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dk.id,
    dk.query,
    dk.answer,
    dk.source_name,
    dk.source_type,
    dk.confidence,
    (1 - (dk.embedding <=> query_embedding))::FLOAT AS similarity
  FROM deep_search_knowledge dk
  WHERE dk.embedding IS NOT NULL
    AND 1 - (dk.embedding <=> query_embedding) > match_threshold
  ORDER BY dk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: increment_knowledge_usage
CREATE OR REPLACE FUNCTION increment_knowledge_usage(knowledge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE deep_search_knowledge
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = knowledge_id;
END;
$$;

-- Phase 4: Create analytics views

-- View: crm_metrics
CREATE OR REPLACE VIEW crm_metrics AS
SELECT
  salesman_id,
  COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS visits_today,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS visits_this_month,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted_count,
  COUNT(*) AS total_visits,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) AS conversion_rate,
  AVG(duration_seconds) AS avg_duration_seconds
FROM crm_visits
GROUP BY salesman_id;

-- View: top_knowledge
CREATE OR REPLACE VIEW top_knowledge AS
SELECT
  id,
  query,
  LEFT(answer, 200) AS answer_preview,
  source_name,
  source_type,
  auto_tags,
  usage_count,
  confidence,
  verified,
  last_used_at
FROM deep_search_knowledge
ORDER BY usage_count DESC
LIMIT 100;