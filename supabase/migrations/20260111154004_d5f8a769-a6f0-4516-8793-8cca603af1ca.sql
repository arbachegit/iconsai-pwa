-- ============================================
-- MIGRATION: Criar tabela regional_pronunciations
-- Pronúncias regionais brasileiras para TTS
-- ============================================

-- 1. Criar tabela regional_pronunciations
CREATE TABLE IF NOT EXISTS regional_pronunciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL,
  term TEXT NOT NULL,
  pronunciation TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique: não pode ter mesmo termo na mesma região
  UNIQUE(region_code, term)
);

-- 2. CHECK constraint para códigos de região válidos
ALTER TABLE regional_pronunciations
ADD CONSTRAINT regional_pronunciations_region_check
CHECK (region_code IN ('SUL', 'NORDESTE', 'NORTE', 'CENTRO_OESTE', 'SUDESTE_SP', 'SUDESTE_RJ', 'SUDESTE_MG'));

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_regional_pron_region 
ON regional_pronunciations(region_code) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_regional_pron_term 
ON regional_pronunciations(term) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_regional_pron_region_term 
ON regional_pronunciations(region_code, term);

-- 4. Trigger para updated_at (usa função existente)
DROP TRIGGER IF EXISTS regional_pronunciations_updated ON regional_pronunciations;

CREATE TRIGGER regional_pronunciations_updated
  BEFORE UPDATE ON regional_pronunciations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS (Row Level Security)
ALTER TABLE regional_pronunciations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read regional_pronunciations"
  ON regional_pronunciations FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert regional_pronunciations"
  ON regional_pronunciations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update regional_pronunciations"
  ON regional_pronunciations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated delete regional_pronunciations"
  ON regional_pronunciations FOR DELETE
  TO authenticated
  USING (true);

-- 6. Comentários
COMMENT ON TABLE regional_pronunciations IS 'Pronúncias regionais brasileiras para TTS - como termos específicos são pronunciados em cada região';
COMMENT ON COLUMN regional_pronunciations.region_code IS 'Código da região: SUL, NORDESTE, NORTE, CENTRO_OESTE, SUDESTE_SP, SUDESTE_RJ, SUDESTE_MG';
COMMENT ON COLUMN regional_pronunciations.term IS 'Termo original a ser pronunciado';
COMMENT ON COLUMN regional_pronunciations.pronunciation IS 'Como o termo deve ser pronunciado naquela região';
COMMENT ON COLUMN regional_pronunciations.is_active IS 'Se a regra está ativa';
COMMENT ON COLUMN regional_pronunciations.priority IS 'Prioridade da regra (maior = mais prioritária)';