-- Tabela de resumos por módulo
CREATE TABLE IF NOT EXISTS pwa_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  module_type TEXT NOT NULL CHECK (module_type IN ('health', 'ideas', 'world', 'help')),
  summary TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  last_user_message TEXT,
  last_assistant_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwa_summaries_device ON pwa_conversation_summaries(device_id);
CREATE INDEX IF NOT EXISTS idx_pwa_summaries_module ON pwa_conversation_summaries(device_id, module_type);

-- Enable RLS
ALTER TABLE pwa_conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Policy for service role access (edge functions)
CREATE POLICY "Service role can manage summaries" ON pwa_conversation_summaries
  FOR ALL USING (true) WITH CHECK (true);

-- Garantir que pwa_user_context existe com todas as colunas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pwa_user_context') THEN
    CREATE TABLE pwa_user_context (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id TEXT UNIQUE NOT NULL,
      user_name TEXT,
      interaction_count INTEGER DEFAULT 0,
      last_module TEXT,
      last_topic_summary TEXT,
      last_user_message TEXT,
      last_interaction_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Garantir coluna agent_slug em pwa_messages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pwa_messages' AND column_name = 'agent_slug'
  ) THEN
    ALTER TABLE pwa_messages ADD COLUMN agent_slug TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pwa_messages_agent ON pwa_messages(session_id, agent_slug);