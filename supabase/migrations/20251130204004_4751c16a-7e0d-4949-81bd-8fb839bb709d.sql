-- Create chat_config table for dynamic chat configurations
CREATE TABLE IF NOT EXISTS public.chat_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type TEXT UNIQUE NOT NULL CHECK (chat_type IN ('study', 'health')),
  
  -- RAG Configurations
  match_threshold DECIMAL(3,2) DEFAULT 0.15,
  match_count INTEGER DEFAULT 5,
  
  -- Scope (extracted from system prompts)
  scope_topics TEXT[] DEFAULT '{}',
  rejection_message TEXT,
  
  -- System Prompt Instructions
  system_prompt_base TEXT,
  rag_priority_instruction TEXT,
  
  -- Dynamic Metadata (automatically updated)
  total_documents INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  last_document_added TIMESTAMPTZ,
  
  -- Health Alerts
  health_status TEXT DEFAULT 'ok' CHECK (health_status IN ('ok', 'warning', 'error')),
  health_issues JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage chat_config
CREATE POLICY "Admins can manage chat_config"
ON public.chat_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial configurations
INSERT INTO public.chat_config (chat_type, scope_topics, rejection_message, system_prompt_base) VALUES
('study', 
  ARRAY['KnowRISK', 'KnowYOU', 'ACC', 'Website', 'História da IA'], 
  'Sou especializado em ajudar a estudar sobre a KnowRISK, KnowYOU, ACC e o conteúdo deste website.',
  'Você é um assistente de IA especializado em ajudar a estudar sobre a KnowRISK, KnowYOU, ACC e o conteúdo deste website.'),
('health', 
  ARRAY['Hospital Moinhos de Vento', 'Medicina', 'Saúde', 'Tratamentos', 'Bem-estar'], 
  'Sou o KnowYOU, especializado em saúde e Hospital Moinhos de Vento.',
  'Você é o KnowYOU, um assistente de IA especializado em saúde e no Hospital Moinhos de Vento.');

-- Function to update chat_config stats when documents change
CREATE OR REPLACE FUNCTION public.update_chat_config_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_config SET
    total_documents = (
      SELECT COUNT(*) 
      FROM public.documents 
      WHERE target_chat = NEW.target_chat AND status = 'completed'
    ),
    total_chunks = (
      SELECT COUNT(*) 
      FROM public.document_chunks dc 
      JOIN public.documents d ON dc.document_id = d.id 
      WHERE d.target_chat = NEW.target_chat AND d.status = 'completed'
    ),
    last_document_added = NOW(),
    updated_at = NOW()
  WHERE chat_type = NEW.target_chat;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update chat_config when documents change
CREATE TRIGGER on_document_change_update_config
AFTER INSERT OR UPDATE ON public.documents
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.update_chat_config_stats();

-- Function to calculate initial stats for existing documents
CREATE OR REPLACE FUNCTION public.initialize_chat_config_stats()
RETURNS void AS $$
BEGIN
  UPDATE public.chat_config cc SET
    total_documents = (
      SELECT COUNT(*) 
      FROM public.documents 
      WHERE target_chat = cc.chat_type AND status = 'completed'
    ),
    total_chunks = (
      SELECT COUNT(*) 
      FROM public.document_chunks dc 
      JOIN public.documents d ON dc.document_id = d.id 
      WHERE d.target_chat = cc.chat_type AND d.status = 'completed'
    ),
    last_document_added = (
      SELECT MAX(created_at) 
      FROM public.documents 
      WHERE target_chat = cc.chat_type AND status = 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Initialize stats for existing documents
SELECT public.initialize_chat_config_stats();