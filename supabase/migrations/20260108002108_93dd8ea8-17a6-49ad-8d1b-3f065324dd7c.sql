-- Tabela para armazenar contexto persistente por usuário (memória contextual)
CREATE TABLE public.pwa_user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  user_name TEXT,
  interaction_count INTEGER DEFAULT 0,
  last_module TEXT, -- 'health', 'ideas', 'world', 'help'
  last_topic_summary TEXT, -- Resumo do último tópico discutido (max 200 chars)
  last_user_message TEXT, -- Última mensagem do usuário (para contexto)
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por device_id
CREATE INDEX idx_pwa_user_context_device_id ON pwa_user_context(device_id);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_pwa_user_context_updated_at
BEFORE UPDATE ON pwa_user_context
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.pwa_user_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for pwa_user_context"
ON public.pwa_user_context FOR ALL
USING (true) WITH CHECK (true);