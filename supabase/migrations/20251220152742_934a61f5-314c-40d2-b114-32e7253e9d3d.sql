-- Fase 1: Adicionar novas colunas na tabela chat_agents
ALTER TABLE chat_agents 
ADD COLUMN IF NOT EXISTS humanization_level INTEGER DEFAULT 85,
ADD COLUMN IF NOT EXISTS pause_level INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS deterministic_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agent_color TEXT DEFAULT '#00D4FF';

-- Fase 2: Criar tabela agent_pronunciations para pronúncias AFI/IPA
CREATE TABLE IF NOT EXISTS agent_pronunciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  approximate TEXT NOT NULL,
  ipa TEXT,
  variations TEXT,
  category TEXT DEFAULT 'geral',
  is_global BOOLEAN DEFAULT true,
  agent_id UUID REFERENCES chat_agents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fase 3: Criar tabela agent_phrases para frases boas/ruins
CREATE TABLE IF NOT EXISTS agent_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase TEXT NOT NULL,
  phrase_type TEXT NOT NULL CHECK (phrase_type IN ('good', 'bad')),
  category TEXT DEFAULT 'geral',
  replacement TEXT,
  is_global BOOLEAN DEFAULT true,
  agent_id UUID REFERENCES chat_agents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para agent_pronunciations
ALTER TABLE agent_pronunciations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage agent pronunciations"
ON agent_pronunciations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can read pronunciations"
ON agent_pronunciations FOR SELECT
USING (true);

-- RLS para agent_phrases
ALTER TABLE agent_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage agent phrases"
ON agent_phrases FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can read phrases"
ON agent_phrases FOR SELECT
USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agent_pronunciations_global ON agent_pronunciations(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_agent_pronunciations_agent ON agent_pronunciations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_phrases_type ON agent_phrases(phrase_type);
CREATE INDEX IF NOT EXISTS idx_agent_phrases_global ON agent_phrases(is_global) WHERE is_global = true;