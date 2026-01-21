-- Criar tabela document_versions para rastreamento de versões
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('INITIAL', 'UPDATE', 'REPROCESS')),
  log_message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índices para document_versions
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);

-- Habilitar RLS em document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para document_versions
CREATE POLICY "Admins can manage document_versions"
  ON public.document_versions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can read document_versions"
  ON public.document_versions FOR SELECT
  USING (true);

-- Criar tabela rag_analytics para logs de performance da busca
CREATE TABLE public.rag_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  target_chat TEXT,
  latency_ms INTEGER NOT NULL,
  success_status BOOLEAN NOT NULL,
  results_count INTEGER DEFAULT 0,
  top_similarity_score DOUBLE PRECISION,
  match_threshold DOUBLE PRECISION,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índices para rag_analytics
CREATE INDEX idx_rag_analytics_created_at ON rag_analytics(created_at DESC);
CREATE INDEX idx_rag_analytics_query ON rag_analytics(query);
CREATE INDEX idx_rag_analytics_success ON rag_analytics(success_status);

-- Habilitar RLS em rag_analytics
ALTER TABLE public.rag_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para rag_analytics (INSERT público para logs, SELECT apenas admin)
CREATE POLICY "System can insert analytics"
  ON public.rag_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read analytics"
  ON public.rag_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar coluna content_hash na tabela documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Criar índice para content_hash
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash);

-- Remover índice ivfflat antigo se existir e criar novo índice HNSW otimizado
DROP INDEX IF EXISTS document_chunks_embedding_idx;

-- Criar índice HNSW para busca vetorial otimizada
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
  ON document_chunks 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);