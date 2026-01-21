-- Tabela para regras de aprendizado de máquina de roteamento de chat
CREATE TABLE IF NOT EXISTS public.chat_routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_filename_pattern TEXT NOT NULL,
  suggested_chat TEXT NOT NULL,
  corrected_chat TEXT NOT NULL,
  correction_count INTEGER DEFAULT 1,
  confidence NUMERIC DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT DEFAULT 'admin',
  UNIQUE(document_filename_pattern, suggested_chat, corrected_chat)
);

-- Enable RLS
ALTER TABLE public.chat_routing_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage chat routing rules" ON public.chat_routing_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can read chat routing rules" ON public.chat_routing_rules
  FOR SELECT USING (true);

-- Function to increment routing rule count
CREATE OR REPLACE FUNCTION public.increment_chat_routing_rule_count(
  p_filename_pattern TEXT,
  p_suggested_chat TEXT,
  p_corrected_chat TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_routing_rules (
    document_filename_pattern,
    suggested_chat,
    corrected_chat,
    correction_count,
    confidence
  ) VALUES (
    p_filename_pattern,
    p_suggested_chat,
    p_corrected_chat,
    1,
    0.5
  )
  ON CONFLICT (document_filename_pattern, suggested_chat, corrected_chat)
  DO UPDATE SET
    correction_count = chat_routing_rules.correction_count + 1,
    confidence = LEAST(0.95, 0.5 + (chat_routing_rules.correction_count * 0.1)),
    updated_at = now();
END;
$$;