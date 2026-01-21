-- Add process_pmc_national_aggregation function to aggregate regional PMC values into national totals
-- National aggregates use uf_code = 0 to distinguish from regional data
-- Note: reference_year and reference_month are generated columns, so we don't insert into them

CREATE OR REPLACE FUNCTION public.process_pmc_national_aggregation()
RETURNS TABLE(indicator_code text, records_inserted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete existing national aggregates (uf_code = 0)
  DELETE FROM public.pmc_valores_reais WHERE uf_code = 0;

  -- Insert national aggregates by summing regional values for each date
  -- Mapping: PMC_VAREJO_UF → PMC, PMC_COMB_UF → PMC_COMB, etc.
  INSERT INTO public.pmc_valores_reais (
    pmc_indicator_id,
    pmc_indicator_code,
    uf_code,
    reference_date,
    indice_pmc_original,
    pac_receita_anual,
    pac_receita_mensal_media,
    valor_estimado_reais,
    calculation_method
  )
  SELECT
    NULL as pmc_indicator_id,
    CASE pmc_indicator_code
      WHEN 'PMC_VAREJO_UF' THEN 'PMC'
      WHEN 'PMC_COMB_UF' THEN 'PMC_COMB'
      WHEN 'PMC_COMBUSTIVEIS_UF' THEN 'PMC_COMB'
      WHEN 'PMC_CONST_UF' THEN 'PMC_CONST'
      WHEN 'PMC_CONSTRUCAO_UF' THEN 'PMC_CONST'
      WHEN 'PMC_FARM_UF' THEN 'PMC_FARM'
      WHEN 'PMC_FARMACIA_UF' THEN 'PMC_FARM'
      WHEN 'PMC_MOV_UF' THEN 'PMC_MOV'
      WHEN 'PMC_MOVEIS_UF' THEN 'PMC_MOV'
      WHEN 'PMC_VEICULOS_UF' THEN 'PMC_VEIC'
      WHEN 'PMC_VEST_UF' THEN 'PMC_VEST'
      WHEN 'PMC_VESTUARIO_UF' THEN 'PMC_VEST'
      ELSE REPLACE(pmc_indicator_code, '_UF', '')
    END as pmc_indicator_code,
    0 as uf_code,
    reference_date,
    AVG(indice_pmc_original) as indice_pmc_original,
    SUM(pac_receita_anual) as pac_receita_anual,
    SUM(pac_receita_mensal_media) as pac_receita_mensal_media,
    SUM(valor_estimado_reais) as valor_estimado_reais,
    'national_aggregation' as calculation_method
  FROM public.pmc_valores_reais
  WHERE uf_code IS NOT NULL AND uf_code > 0 AND valor_estimado_reais IS NOT NULL
  GROUP BY 
    CASE pmc_indicator_code
      WHEN 'PMC_VAREJO_UF' THEN 'PMC'
      WHEN 'PMC_COMB_UF' THEN 'PMC_COMB'
      WHEN 'PMC_COMBUSTIVEIS_UF' THEN 'PMC_COMB'
      WHEN 'PMC_CONST_UF' THEN 'PMC_CONST'
      WHEN 'PMC_CONSTRUCAO_UF' THEN 'PMC_CONST'
      WHEN 'PMC_FARM_UF' THEN 'PMC_FARM'
      WHEN 'PMC_FARMACIA_UF' THEN 'PMC_FARM'
      WHEN 'PMC_MOV_UF' THEN 'PMC_MOV'
      WHEN 'PMC_MOVEIS_UF' THEN 'PMC_MOV'
      WHEN 'PMC_VEICULOS_UF' THEN 'PMC_VEIC'
      WHEN 'PMC_VEST_UF' THEN 'PMC_VEST'
      WHEN 'PMC_VESTUARIO_UF' THEN 'PMC_VEST'
      ELSE REPLACE(pmc_indicator_code, '_UF', '')
    END,
    reference_date;

  -- Return summary of what was inserted
  RETURN QUERY
  SELECT
    pv.pmc_indicator_code::text,
    COUNT(*)::integer as records_inserted
  FROM public.pmc_valores_reais pv
  WHERE pv.uf_code = 0
  GROUP BY pv.pmc_indicator_code
  ORDER BY pv.pmc_indicator_code;
END;
$$;

-- Execute the aggregation to populate national data
SELECT * FROM process_pmc_national_aggregation();