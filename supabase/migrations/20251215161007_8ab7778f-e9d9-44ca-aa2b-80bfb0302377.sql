-- Create chat_agents table for managing chat agents
CREATE TABLE public.chat_agents (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  greeting_message TEXT,
  
  -- RAG Configuration
  rag_collection TEXT NOT NULL,
  match_threshold DECIMAL(3,2) DEFAULT 0.15,
  match_count INTEGER DEFAULT 20,
  
  -- Delimitações
  allowed_tags TEXT[] DEFAULT '{}',
  forbidden_tags TEXT[] DEFAULT '{}',
  system_prompt TEXT,
  rejection_message TEXT,
  
  -- Capacidades (JSONB)
  capabilities JSONB DEFAULT '{"voice": true, "file_upload": true, "charts": true, "drawing": true, "math": true}',
  
  -- Comunicação
  regional_tone TEXT DEFAULT 'default',
  pronunciation_set TEXT DEFAULT 'general',
  maieutic_level TEXT DEFAULT 'media',
  
  -- Badges
  suggested_badges JSONB DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.chat_agents ENABLE ROW LEVEL SECURITY;

-- Public read policy for active agents
CREATE POLICY "Anyone can read active chat agents"
ON public.chat_agents
FOR SELECT
USING (is_active = true);

-- Admin management policy
CREATE POLICY "Admins can manage chat agents"
ON public.chat_agents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_chat_agents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER update_chat_agents_timestamp
  BEFORE UPDATE ON public.chat_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_agents_updated_at();

-- Insert initial records
INSERT INTO public.chat_agents (name, slug, description, rag_collection, greeting_message)
VALUES 
  (
    'Chat de Estudo',
    'study',
    'Assistente especializado em ajudar a estudar sobre a KnowRISK, KnowYOU, ACC e o conteúdo do website.',
    'study',
    'Olá! Sou o assistente de estudos. Como posso ajudá-lo a aprender mais sobre a KnowRISK hoje?'
  ),
  (
    'Chat de Saúde',
    'health',
    'Assistente especializado em auxiliar profissionais de saúde com informações médicas e de bem-estar.',
    'health',
    'Olá! Sou o assistente de saúde. Como posso ajudá-lo com informações de saúde hoje?'
  );