-- ================================================================
-- ESTRUTURA PARA CONVERSÃO PMC ÍNDICE → R$
-- ================================================================

-- ================================================================
-- 1. TABELA DE MAPEAMENTO PAC ↔ PMC
-- ================================================================
CREATE TABLE IF NOT EXISTS pac_pmc_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pmc_indicator_code TEXT NOT NULL,
  pmc_indicator_name TEXT NOT NULL,
  pac_indicator_code TEXT NOT NULL,
  pac_indicator_name TEXT NOT NULL,
  conversion_factor NUMERIC DEFAULT 1.0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pmc_indicator_code)
);

CREATE INDEX IF NOT EXISTS idx_pac_pmc_pmc_code ON pac_pmc_mapping(pmc_indicator_code);
CREATE INDEX IF NOT EXISTS idx_pac_pmc_pac_code ON pac_pmc_mapping(pac_indicator_code);

-- ================================================================
-- 2. POPULAR MAPEAMENTO PAC ↔ PMC (códigos existentes)
-- ================================================================
INSERT INTO pac_pmc_mapping (pmc_indicator_code, pmc_indicator_name, pac_indicator_code, pac_indicator_name, notes) VALUES
('PMC_VAREJO_UF', 'Varejo - Volume de vendas (Regional)', 'PAC_VAREJO_RB_UF', 'Receita Bruta Varejo (Regional)', 'Mapeamento direto'),
('PMC_COMB_UF', 'Varejo - Combustíveis (Regional)', 'PAC_COMBUSTIVEIS_RB_UF', 'Receita Bruta Combustíveis (Regional)', 'Mapeamento direto'),
('PMC_VEST_UF', 'Varejo - Vestuário (Regional)', 'PAC_TECIDOS_RB_UF', 'Receita Bruta Tecidos/Vestuário (Regional)', 'Mapeamento direto'),
('PMC_VEICULOS_UF', 'Varejo Ampliado - Veículos (Regional)', 'PAC_VEICULOS_RB_UF', 'Receita Bruta Veículos (Regional)', 'Mapeamento direto'),
('PMC_MOV_UF', 'Varejo - Móveis/Eletro (Regional)', 'PAC_VAREJO_RB_UF', 'Receita Bruta Varejo (Regional)', 'Proxy: usar receita total varejo'),
('PMC_FARM_UF', 'Varejo - Farmácia (Regional)', 'PAC_VAREJO_RB_UF', 'Receita Bruta Varejo (Regional)', 'Proxy: usar receita total varejo'),
('PMC_CONST_UF', 'Varejo Ampliado - Mat. Construção (Regional)', 'PAC_VAREJO_RB_UF', 'Receita Bruta Varejo (Regional)', 'Proxy: usar receita total varejo')
ON CONFLICT (pmc_indicator_code) DO UPDATE SET
  pac_indicator_code = EXCLUDED.pac_indicator_code,
  pac_indicator_name = EXCLUDED.pac_indicator_name,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ================================================================
-- 3. TABELA DE VALORES PMC CONVERTIDOS EM R$
-- ================================================================
CREATE TABLE IF NOT EXISTS pmc_valores_reais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pmc_indicator_id UUID REFERENCES economic_indicators(id) ON DELETE CASCADE,
  pmc_indicator_code TEXT NOT NULL,
  uf_code INTEGER,
  reference_date DATE NOT NULL,
  reference_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM reference_date)::INTEGER) STORED,
  reference_month INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM reference_date)::INTEGER) STORED,
  indice_pmc_original NUMERIC NOT NULL,
  pac_receita_anual NUMERIC,
  pac_receita_mensal_media NUMERIC,
  valor_estimado_reais NUMERIC,
  ipca_deflator NUMERIC DEFAULT 1.0,
  valor_deflacionado_reais NUMERIC,
  calculation_method TEXT DEFAULT 'PAC_PROPORTIONAL',
  pac_year_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pmc_indicator_code, uf_code, reference_date)
);

CREATE INDEX IF NOT EXISTS idx_pmc_reais_indicator ON pmc_valores_reais(pmc_indicator_code);
CREATE INDEX IF NOT EXISTS idx_pmc_reais_date ON pmc_valores_reais(reference_date);
CREATE INDEX IF NOT EXISTS idx_pmc_reais_uf ON pmc_valores_reais(uf_code);
CREATE INDEX IF NOT EXISTS idx_pmc_reais_year ON pmc_valores_reais(reference_year);

-- ================================================================
-- 4. FUNÇÃO DE CONVERSÃO PMC → R$
-- ================================================================
CREATE OR REPLACE FUNCTION convert_pmc_to_reais(
  p_pmc_indicator_code TEXT,
  p_uf_code INTEGER,
  p_reference_date DATE
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_indice NUMERIC;
  v_pac_receita NUMERIC;
  v_pac_indicator_code TEXT;
  v_year INTEGER;
  v_valor_reais NUMERIC;
  v_pmc_indicator_id UUID;
BEGIN
  v_year := EXTRACT(YEAR FROM p_reference_date)::INTEGER;
  
  -- 1. Buscar índice PMC do mês (regional)
  SELECT iv.value, ei.id INTO v_indice, v_pmc_indicator_id
  FROM indicator_regional_values iv
  JOIN economic_indicators ei ON ei.id = iv.indicator_id
  WHERE ei.code = p_pmc_indicator_code
    AND iv.uf_code = p_uf_code
    AND iv.reference_date = p_reference_date;
  
  IF v_indice IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 2. Buscar código PAC correspondente
  SELECT pac_indicator_code INTO v_pac_indicator_code
  FROM pac_pmc_mapping
  WHERE pmc_indicator_code = p_pmc_indicator_code
    AND is_active = true;
  
  IF v_pac_indicator_code IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 3. Buscar receita PAC do ano (ou ano mais próximo)
  SELECT irv.value INTO v_pac_receita
  FROM indicator_regional_values irv
  JOIN economic_indicators ei ON ei.id = irv.indicator_id
  WHERE ei.code = v_pac_indicator_code
    AND irv.uf_code = p_uf_code
    AND EXTRACT(YEAR FROM irv.reference_date)::INTEGER = v_year;
  
  -- Se não encontrou, buscar ano anterior mais próximo
  IF v_pac_receita IS NULL THEN
    SELECT irv.value INTO v_pac_receita
    FROM indicator_regional_values irv
    JOIN economic_indicators ei ON ei.id = irv.indicator_id
    WHERE ei.code = v_pac_indicator_code
      AND irv.uf_code = p_uf_code
      AND EXTRACT(YEAR FROM irv.reference_date)::INTEGER < v_year
    ORDER BY irv.reference_date DESC
    LIMIT 1;
  END IF;
  
  IF v_pac_receita IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 4. Calcular valor em R$ mil: (índice/100) * (receita_anual/12)
  v_valor_reais := (v_indice / 100.0) * (v_pac_receita / 12.0);
  
  -- 5. Inserir/atualizar na tabela de valores convertidos
  INSERT INTO pmc_valores_reais (
    pmc_indicator_id, pmc_indicator_code, uf_code, reference_date,
    indice_pmc_original, pac_receita_anual, pac_receita_mensal_media,
    valor_estimado_reais, pac_year_used
  ) VALUES (
    v_pmc_indicator_id, p_pmc_indicator_code, p_uf_code, p_reference_date,
    v_indice, v_pac_receita, v_pac_receita / 12.0, v_valor_reais, v_year
  )
  ON CONFLICT (pmc_indicator_code, uf_code, reference_date) 
  DO UPDATE SET
    indice_pmc_original = EXCLUDED.indice_pmc_original,
    pac_receita_anual = EXCLUDED.pac_receita_anual,
    pac_receita_mensal_media = EXCLUDED.pac_receita_mensal_media,
    valor_estimado_reais = EXCLUDED.valor_estimado_reais,
    pac_year_used = EXCLUDED.pac_year_used,
    updated_at = NOW();
  
  RETURN v_valor_reais;
END;
$$;

-- ================================================================
-- 5. FUNÇÃO PARA PROCESSAR TODOS OS PMC DE UMA VEZ
-- ================================================================
CREATE OR REPLACE FUNCTION process_all_pmc_conversions()
RETURNS TABLE (
  indicator_code TEXT,
  records_processed INTEGER,
  records_converted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mapping RECORD;
  v_value RECORD;
  v_converted NUMERIC;
  v_processed INTEGER;
  v_success INTEGER;
BEGIN
  FOR v_mapping IN 
    SELECT pmc_indicator_code FROM pac_pmc_mapping WHERE is_active = true
  LOOP
    v_processed := 0;
    v_success := 0;
    
    FOR v_value IN
      SELECT irv.uf_code, irv.reference_date
      FROM indicator_regional_values irv
      JOIN economic_indicators ei ON ei.id = irv.indicator_id
      WHERE ei.code = v_mapping.pmc_indicator_code
    LOOP
      v_processed := v_processed + 1;
      
      v_converted := convert_pmc_to_reais(
        v_mapping.pmc_indicator_code,
        v_value.uf_code,
        v_value.reference_date
      );
      
      IF v_converted IS NOT NULL THEN
        v_success := v_success + 1;
      END IF;
    END LOOP;
    
    indicator_code := v_mapping.pmc_indicator_code;
    records_processed := v_processed;
    records_converted := v_success;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ================================================================
-- 6. RLS POLICIES
-- ================================================================
ALTER TABLE pac_pmc_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmc_valores_reais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pac_pmc_mapping" ON pac_pmc_mapping
  FOR SELECT USING (true);

CREATE POLICY "Public read pmc_valores_reais" ON pmc_valores_reais
  FOR SELECT USING (true);

CREATE POLICY "Admin manage pac_pmc_mapping" ON pac_pmc_mapping
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admin manage pmc_valores_reais" ON pmc_valores_reais
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- ================================================================
-- COMENTÁRIOS
-- ================================================================
COMMENT ON TABLE pac_pmc_mapping IS 'Mapeamento entre indicadores PMC (índice) e PAC (receita R$)';
COMMENT ON TABLE pmc_valores_reais IS 'Valores PMC convertidos de índice para R$ mil usando receita PAC';
COMMENT ON FUNCTION convert_pmc_to_reais IS 'Converte índice PMC para valor estimado em R$ mil';
COMMENT ON FUNCTION process_all_pmc_conversions IS 'Processa conversão de todos os indicadores PMC mapeados';