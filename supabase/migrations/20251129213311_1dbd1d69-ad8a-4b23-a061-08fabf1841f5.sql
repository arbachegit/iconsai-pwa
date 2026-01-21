-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_text TEXT NOT NULL,
  text_preview TEXT,
  target_chat TEXT NOT NULL CHECK (target_chat IN ('health', 'study', 'general')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  total_chunks INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0,
  is_readable BOOLEAN DEFAULT true,
  ai_summary TEXT,
  readability_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create document_chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create document_tags table for hierarchical tagging
CREATE TABLE IF NOT EXISTS document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('parent', 'child')),
  parent_tag_id UUID REFERENCES document_tags(id),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Admins can manage documents" ON documents
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert documents" ON documents
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update documents" ON documents
FOR UPDATE USING (true);

-- RLS Policies for document_chunks
CREATE POLICY "Admins can manage chunks" ON document_chunks
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert chunks" ON document_chunks
FOR INSERT WITH CHECK (true);

-- RLS Policies for document_tags
CREATE POLICY "Admins can manage tags" ON document_tags
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert tags" ON document_tags
FOR INSERT WITH CHECK (true);

-- Create function for semantic search
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding VECTOR(1536),
  target_chat_filter TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id AS chunk_id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE d.status = 'completed'
    AND d.is_readable = true
    AND (target_chat_filter IS NULL OR d.target_chat = target_chat_filter)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;