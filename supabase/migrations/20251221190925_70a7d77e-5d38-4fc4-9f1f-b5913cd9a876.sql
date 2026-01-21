-- ============================================
-- SISTEMA DE COMUNICAÇÃO - MIGRATION
-- ============================================

-- 1. Expandir regional_tone_rules com campos de expressões regionais
ALTER TABLE regional_tone_rules 
ADD COLUMN IF NOT EXISTS formality_level INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS warmth_level INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS greetings TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS affirmations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expressions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_terms JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS avoided_terms TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS voice_style TEXT DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS speech_rate FLOAT DEFAULT 1.0;

-- Atualizar dados regionais existentes com expressões
UPDATE regional_tone_rules SET
  greetings = ARRAY['Oi', 'Olá', 'E aí'],
  affirmations = ARRAY['Beleza', 'Tranquilo', 'Certo'],
  warmth_level = 3,
  formality_level = 3
WHERE region_code = 'sudeste-sp';

UPDATE regional_tone_rules SET
  greetings = ARRAY['E aí', 'Fala', 'Oi'],
  affirmations = ARRAY['Beleza', 'Suave', 'Firmeza'],
  warmth_level = 4,
  formality_level = 2,
  expressions = ARRAY['Cara', 'Mermão', 'Tá ligado']
WHERE region_code = 'sudeste-rj';

UPDATE regional_tone_rules SET
  greetings = ARRAY['Oi', 'Olá', 'E aí, meu rei'],
  affirmations = ARRAY['Oxe', 'Massa', 'Arretado'],
  warmth_level = 5,
  formality_level = 2,
  expressions = ARRAY['Mainha', 'Véi', 'Oxente']
WHERE region_code = 'nordeste';

UPDATE regional_tone_rules SET
  greetings = ARRAY['Oi', 'Bah', 'E aí'],
  affirmations = ARRAY['Bah', 'Tri legal', 'Capaz'],
  warmth_level = 4,
  formality_level = 3,
  expressions = ARRAY['Tchê', 'Guri', 'Barbaridade']
WHERE region_code = 'sul';

-- 2. Criar tabela communication_styles
CREATE TABLE IF NOT EXISTS communication_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_code TEXT NOT NULL UNIQUE,
  style_name TEXT NOT NULL,
  description TEXT,
  
  -- Parâmetros (1-5)
  formality INTEGER DEFAULT 3,
  complexity INTEGER DEFAULT 3,
  verbosity INTEGER DEFAULT 3,
  empathy INTEGER DEFAULT 3,
  
  -- Estrutura de resposta
  use_bullet_points BOOLEAN DEFAULT false,
  use_examples BOOLEAN DEFAULT true,
  max_paragraph_length INTEGER DEFAULT 3,
  
  -- Persona
  persona_description TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para communication_styles
CREATE INDEX IF NOT EXISTS idx_communication_styles_code ON communication_styles(style_code);
CREATE INDEX IF NOT EXISTS idx_communication_styles_active ON communication_styles(is_active);

-- RLS para communication_styles
ALTER TABLE communication_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage communication_styles" ON communication_styles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Public read active communication_styles" ON communication_styles FOR SELECT
USING (is_active = true);

-- 3. Criar tabela speech_humanization
CREATE TABLE IF NOT EXISTS speech_humanization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contexto
  trigger_pattern TEXT NOT NULL,
  trigger_type TEXT DEFAULT 'keyword',
  context TEXT,
  
  -- Ação
  action_type TEXT NOT NULL,
  
  -- Parâmetros
  duration_ms INTEGER,
  emphasis_level FLOAT,
  speed_multiplier FLOAT,
  ssml_tag TEXT,
  
  -- Controle
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para speech_humanization
CREATE INDEX IF NOT EXISTS idx_speech_humanization_active ON speech_humanization(is_active);
CREATE INDEX IF NOT EXISTS idx_speech_humanization_priority ON speech_humanization(priority DESC);
CREATE INDEX IF NOT EXISTS idx_speech_humanization_type ON speech_humanization(trigger_type);

-- RLS para speech_humanization
ALTER TABLE speech_humanization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage speech_humanization" ON speech_humanization FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System read speech_humanization" ON speech_humanization FOR SELECT
USING (true);

-- 4. Adicionar FK communication_style_id em chat_agents
ALTER TABLE chat_agents 
ADD COLUMN IF NOT EXISTS communication_style_id UUID REFERENCES communication_styles(id);

-- 5. Trigger para updated_at em communication_styles
CREATE OR REPLACE FUNCTION update_communication_styles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_communication_styles_updated_at ON communication_styles;
CREATE TRIGGER trigger_communication_styles_updated_at
  BEFORE UPDATE ON communication_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_communication_styles_updated_at();

-- 6. SEED DATA - Estilos de comunicação
INSERT INTO communication_styles (style_code, style_name, formality, complexity, verbosity, empathy, description, persona_description, use_bullet_points, use_examples) VALUES
('professional', 'Profissional', 4, 4, 3, 3, 'Tom corporativo e objetivo', 'Consultor experiente, direto e confiável', false, true),
('friendly', 'Amigável', 2, 2, 4, 5, 'Tom informal e acolhedor', 'Amigo próximo que entende de negócios', true, true),
('technical', 'Técnico', 5, 5, 3, 2, 'Linguagem especializada e precisa', 'Especialista técnico detalhista', false, false),
('educational', 'Educativo', 3, 2, 4, 4, 'Explicativo e didático', 'Professor paciente e dedicado', true, true),
('supportive', 'Acolhedor', 2, 2, 4, 5, 'Empático e paciente', 'Mentor compreensivo e encorajador', true, true)
ON CONFLICT (style_code) DO NOTHING;

-- 7. SEED DATA - Regras de humanização de fala
INSERT INTO speech_humanization (trigger_pattern, trigger_type, context, action_type, duration_ms, emphasis_level, priority) VALUES
('.', 'keyword', 'end_sentence', 'pause', 400, NULL, 10),
('?', 'keyword', 'question', 'pause', 500, NULL, 10),
('!', 'keyword', 'exclamation', 'pause', 300, NULL, 10),
(',', 'keyword', 'clause', 'pause', 200, NULL, 5),
(':', 'keyword', 'before_list', 'pause', 350, NULL, 8),
('...', 'keyword', 'hesitation', 'pause', 600, NULL, 15),
('\d+%', 'regex', 'percentage', 'emphasis', NULL, 1.2, 5),
('R\$\s*[\d.,]+', 'regex', 'currency', 'emphasis', NULL, 1.15, 5),
('\d{1,3}(?:\.\d{3})*(?:,\d+)?', 'regex', 'large_number', 'pause', 150, 1.1, 3),
('Importante:', 'keyword', 'highlight', 'emphasis', 200, 1.3, 12),
('Atenção:', 'keyword', 'warning', 'emphasis', 250, 1.4, 12),
(';', 'keyword', 'semicolon', 'pause', 250, NULL, 6);

-- 8. Vincular agentes existentes ao estilo profissional por padrão
UPDATE chat_agents 
SET communication_style_id = (SELECT id FROM communication_styles WHERE style_code = 'professional' LIMIT 1)
WHERE communication_style_id IS NULL;