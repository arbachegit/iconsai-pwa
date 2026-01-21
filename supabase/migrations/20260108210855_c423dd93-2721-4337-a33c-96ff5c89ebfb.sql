-- ============================================================
-- PWA Conversations Tables Migration
-- ============================================================

-- 1. Tabela pwa_conversation_sessions
CREATE TABLE public.pwa_conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  company TEXT,
  company_source TEXT DEFAULT 'undefined' CHECK (company_source IN ('dns', 'user_input', 'undefined')),
  module_type TEXT NOT NULL CHECK (module_type IN ('world', 'health', 'ideas')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  city TEXT,
  country TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela pwa_conversation_messages
CREATE TABLE public.pwa_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.pwa_conversation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  transcription TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  taxonomy_tags TEXT[] DEFAULT '{}',
  key_topics JSONB DEFAULT '{"people":[],"countries":[],"organizations":[]}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela pwa_conv_summaries (nome diferente para evitar conflito com existente)
CREATE TABLE public.pwa_conv_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.pwa_conversation_sessions(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  summary_audio_url TEXT,
  taxonomy_tags TEXT[] DEFAULT '{}',
  key_topics JSONB DEFAULT '{"people":[],"countries":[],"organizations":[]}',
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indices para Performance
-- ============================================================

CREATE INDEX idx_pwa_conv_sessions_device ON public.pwa_conversation_sessions(device_id);
CREATE INDEX idx_pwa_conv_sessions_module ON public.pwa_conversation_sessions(module_type);
CREATE INDEX idx_pwa_conv_sessions_started ON public.pwa_conversation_sessions(started_at DESC);
CREATE INDEX idx_pwa_conv_messages_session ON public.pwa_conversation_messages(session_id);
CREATE INDEX idx_pwa_conv_messages_taxonomy ON public.pwa_conversation_messages USING GIN(taxonomy_tags);
CREATE INDEX idx_pwa_conv_summaries_session ON public.pwa_conv_summaries(session_id);

-- ============================================================
-- Habilitar Row Level Security
-- ============================================================

ALTER TABLE public.pwa_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_conv_summaries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies - Admin/Superadmin Read Access
-- ============================================================

-- Sessions: Admin pode ler
CREATE POLICY "Admin read pwa_conversation_sessions" 
  ON public.pwa_conversation_sessions
  FOR SELECT 
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  );

-- Messages: Admin pode ler
CREATE POLICY "Admin read pwa_conversation_messages" 
  ON public.pwa_conversation_messages
  FOR SELECT 
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  );

-- Summaries: Admin pode ler
CREATE POLICY "Admin read pwa_conv_summaries" 
  ON public.pwa_conv_summaries
  FOR SELECT 
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  );

-- ============================================================
-- RLS Policies - Anon Insert (para PWA sem autenticacao)
-- ============================================================

-- Sessions: Anon pode inserir
CREATE POLICY "Anon insert pwa_conversation_sessions" 
  ON public.pwa_conversation_sessions
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Messages: Anon pode inserir
CREATE POLICY "Anon insert pwa_conversation_messages" 
  ON public.pwa_conversation_messages
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Summaries: Anon pode inserir
CREATE POLICY "Anon insert pwa_conv_summaries" 
  ON public.pwa_conv_summaries
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- ============================================================
-- RLS Policies - Anon Update (para atualizar ended_at)
-- ============================================================

CREATE POLICY "Anon update pwa_conversation_sessions" 
  ON public.pwa_conversation_sessions
  FOR UPDATE 
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Trigger para updated_at automatico
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_pwa_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pwa_conversation_sessions_updated_at
  BEFORE UPDATE ON public.pwa_conversation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_pwa_conversation_updated_at();