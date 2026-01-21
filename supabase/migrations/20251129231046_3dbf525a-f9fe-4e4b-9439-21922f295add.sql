-- Create documentation_versions table for changelog
CREATE TABLE public.documentation_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  author TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.documentation_versions ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage versions
CREATE POLICY "Admins can manage documentation versions"
  ON public.documentation_versions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow everyone to read versions (public documentation)
CREATE POLICY "Everyone can read documentation versions"
  ON public.documentation_versions
  FOR SELECT
  USING (true);

-- Create index on version
CREATE INDEX idx_documentation_versions_version ON public.documentation_versions(version);

-- Insert initial version
INSERT INTO public.documentation_versions (version, changes, author) VALUES (
  '1.0.0',
  '[
    {"type": "added", "component": "database", "description": "Extensão pgvector para busca semântica"},
    {"type": "added", "component": "database", "description": "Tabelas documents, document_chunks, document_tags"},
    {"type": "added", "component": "backend", "description": "Edge Function process-bulk-document com auto-categorização LLM"},
    {"type": "added", "component": "backend", "description": "Edge Functions chat/chat-study com RAG integrado"},
    {"type": "added", "component": "backend", "description": "Edge Function search-documents com pgvector"},
    {"type": "added", "component": "frontend", "description": "DocumentsTab com upload e gestão de PDFs"},
    {"type": "added", "component": "frontend", "description": "Sistema de chat multimodal com imagens"},
    {"type": "added", "component": "frontend", "description": "Dashboard de analytics e conversações"}
  ]'::jsonb,
  'Sistema'
);