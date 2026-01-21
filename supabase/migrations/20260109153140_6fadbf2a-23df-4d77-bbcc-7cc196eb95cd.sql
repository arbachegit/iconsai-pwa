-- Tabela para fonéticas específicas por taxonomia
-- Permite definir pronúncias diferentes para termos em contextos diferentes

CREATE TABLE IF NOT EXISTS taxonomy_phonetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_code TEXT NOT NULL,
  term TEXT NOT NULL,
  phonetic TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(taxonomy_code, term)
);

-- Índices para velocidade
CREATE INDEX idx_taxonomy_phonetics_code ON taxonomy_phonetics(taxonomy_code) WHERE is_active = true;
CREATE INDEX idx_taxonomy_phonetics_term ON taxonomy_phonetics(term) WHERE is_active = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_taxonomy_phonetics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER taxonomy_phonetics_updated
  BEFORE UPDATE ON taxonomy_phonetics
  FOR EACH ROW
  EXECUTE FUNCTION update_taxonomy_phonetics_timestamp();

-- Inserir fonéticas exemplo para economia
INSERT INTO taxonomy_phonetics (taxonomy_code, term, phonetic, priority) VALUES
  ('economia.indicadores.inflacao', 'IPCA', 'ípeca', 10),
  ('economia.indicadores.inflacao', 'IGP-M', 'igepê-ême', 10),
  ('economia.indicadores.monetarios', 'Selic', 'séliqui', 10),
  ('economia.indicadores.monetarios', 'SELIC', 'séliqui', 10),
  ('economia.indicadores.monetarios', 'CDI', 'cedê-í', 10),
  ('economia.mercados.cambio', 'PTAX', 'petáx', 10),
  ('economia.mercados.cambio', 'dólar', 'dólar', 5),
  ('saude.medicamentos', 'mg', 'miligramas', 10),
  ('saude.medicamentos', 'ml', 'mililitros', 10)
ON CONFLICT (taxonomy_code, term) DO NOTHING;

-- RLS
ALTER TABLE taxonomy_phonetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read taxonomy_phonetics"
  ON taxonomy_phonetics FOR SELECT
  USING (true);

-- Comentário
COMMENT ON TABLE taxonomy_phonetics IS 'Fonéticas específicas por categoria de taxonomia para TTS contextual';