-- Create table for estimated PAC values
CREATE TABLE IF NOT EXISTS public.pac_valores_estimados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pac_indicator_id UUID REFERENCES public.economic_indicators(id),
  pac_indicator_code TEXT NOT NULL,
  uf_code INTEGER NOT NULL,
  reference_date DATE NOT NULL,
  reference_year INTEGER NOT NULL,
  valor_original NUMERIC,
  valor_estimado NUMERIC NOT NULL,
  growth_rate_applied NUMERIC,
  base_year_used INTEGER,
  is_extrapolated BOOLEAN DEFAULT true,
  calculation_method TEXT DEFAULT 'cagr_3y',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pac_indicator_code, uf_code, reference_date)
);

-- Enable RLS
ALTER TABLE public.pac_valores_estimados ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public read pac_valores_estimados" ON public.pac_valores_estimados
  FOR SELECT USING (true);

CREATE POLICY "Admin manage pac_valores_estimados" ON public.pac_valores_estimados
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Function to estimate PAC values for 2024-2025
CREATE OR REPLACE FUNCTION public.process_pac_estimation_batch()
RETURNS TABLE(indicator_code TEXT, records_inserted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max_pac_year INTEGER;
BEGIN
  -- Get the latest PAC year available (should be 2023)
  SELECT MAX(EXTRACT(YEAR FROM irv.reference_date))::INTEGER INTO v_max_pac_year
  FROM public.indicator_regional_values irv
  JOIN public.economic_indicators ei ON ei.id = irv.indicator_id
  WHERE ei.code LIKE 'PAC_%';

  -- Delete existing estimated values
  DELETE FROM public.pac_valores_estimados WHERE is_extrapolated = true;

  -- Insert estimated values for 2024 and 2025 using 3-year CAGR
  INSERT INTO public.pac_valores_estimados (
    pac_indicator_id,
    pac_indicator_code,
    uf_code,
    reference_date,
    reference_year,
    valor_original,
    valor_estimado,
    growth_rate_applied,
    base_year_used,
    is_extrapolated,
    calculation_method
  )
  WITH growth_rates AS (
    -- Calculate 3-year CAGR for each indicator/UF combination
    SELECT 
      ei.id as indicator_id,
      ei.code as indicator_code,
      irv.uf_code,
      -- Get value from 3 years ago (2020)
      MAX(CASE WHEN EXTRACT(YEAR FROM irv.reference_date) = v_max_pac_year - 3 THEN irv.value END) as value_t_minus_3,
      -- Get latest value (2023)
      MAX(CASE WHEN EXTRACT(YEAR FROM irv.reference_date) = v_max_pac_year THEN irv.value END) as value_latest,
      v_max_pac_year as latest_year
    FROM public.indicator_regional_values irv
    JOIN public.economic_indicators ei ON ei.id = irv.indicator_id
    WHERE ei.code LIKE 'PAC_%'
      AND EXTRACT(YEAR FROM irv.reference_date) IN (v_max_pac_year - 3, v_max_pac_year)
    GROUP BY ei.id, ei.code, irv.uf_code
    HAVING MAX(CASE WHEN EXTRACT(YEAR FROM irv.reference_date) = v_max_pac_year THEN irv.value END) IS NOT NULL
  ),
  cagr_calculated AS (
    SELECT 
      indicator_id,
      indicator_code,
      uf_code,
      value_latest,
      latest_year,
      -- Calculate CAGR: ((end_value/start_value)^(1/n)) - 1
      CASE 
        WHEN value_t_minus_3 > 0 AND value_latest > 0 THEN
          POWER(value_latest / value_t_minus_3, 1.0/3.0) - 1
        ELSE 0.05 -- Default 5% growth if no historical data
      END as cagr
    FROM growth_rates
    WHERE value_latest IS NOT NULL
  )
  -- Generate rows for 2024 and 2025
  SELECT
    cc.indicator_id,
    cc.indicator_code,
    cc.uf_code,
    MAKE_DATE(cc.latest_year + year_offset, 1, 1) as reference_date,
    cc.latest_year + year_offset as reference_year,
    cc.value_latest as valor_original,
    -- Apply compound growth: value * (1 + cagr)^years
    cc.value_latest * POWER(1 + LEAST(cc.cagr, 0.20), year_offset) as valor_estimado, -- Cap at 20% growth
    LEAST(cc.cagr, 0.20) as growth_rate_applied,
    cc.latest_year as base_year_used,
    true as is_extrapolated,
    'cagr_3y' as calculation_method
  FROM cagr_calculated cc
  CROSS JOIN generate_series(1, 2) as year_offset
  WHERE cc.cagr IS NOT NULL;

  -- Also copy existing PAC data (2023 and earlier) as non-extrapolated
  INSERT INTO public.pac_valores_estimados (
    pac_indicator_id,
    pac_indicator_code,
    uf_code,
    reference_date,
    reference_year,
    valor_original,
    valor_estimado,
    growth_rate_applied,
    base_year_used,
    is_extrapolated,
    calculation_method
  )
  SELECT
    ei.id,
    ei.code,
    irv.uf_code,
    irv.reference_date,
    EXTRACT(YEAR FROM irv.reference_date)::INTEGER,
    irv.value,
    irv.value,
    NULL,
    NULL,
    false,
    'original'
  FROM public.indicator_regional_values irv
  JOIN public.economic_indicators ei ON ei.id = irv.indicator_id
  WHERE ei.code LIKE 'PAC_%'
  ON CONFLICT (pac_indicator_code, uf_code, reference_date) DO NOTHING;

  RETURN QUERY
  SELECT
    pv.pac_indicator_code::text,
    COUNT(*)::integer as records_inserted
  FROM public.pac_valores_estimados pv
  WHERE pv.is_extrapolated = true
  GROUP BY pv.pac_indicator_code
  ORDER BY pv.pac_indicator_code;
END;
$function$;