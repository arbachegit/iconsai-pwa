-- Fix: pmc_valores_reais.reference_year/reference_month are GENERATED ALWAYS; do not insert into them.

CREATE OR REPLACE FUNCTION public.process_all_pmc_conversions_batch()
RETURNS TABLE(indicator_code text, records_inserted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete existing rows (environment requires a WHERE clause)
  DELETE FROM public.pmc_valores_reais WHERE true;

  -- Insert computed conversions (generated columns will be derived from reference_date)
  INSERT INTO public.pmc_valores_reais (
    pmc_indicator_id,
    pmc_indicator_code,
    uf_code,
    reference_date,
    indice_pmc_original,
    pac_receita_anual,
    pac_receita_mensal_media,
    valor_estimado_reais,
    pac_year_used
  )
  SELECT
    ei_pmc.id,
    ei_pmc.code,
    pmc.uf_code,
    pmc.reference_date,
    pmc.value as indice_pmc_original,
    pac.value as pac_receita_anual,
    pac.value / 12.0 as pac_receita_mensal_media,
    (pmc.value / 100.0) * (pac.value / 12.0) as valor_estimado_reais,
    EXTRACT(YEAR FROM pac.reference_date)::INTEGER as pac_year_used
  FROM public.indicator_regional_values pmc
  JOIN public.economic_indicators ei_pmc ON ei_pmc.id = pmc.indicator_id
  JOIN public.pac_pmc_mapping m ON m.pmc_indicator_code = ei_pmc.code AND m.is_active = true
  JOIN public.economic_indicators ei_pac ON ei_pac.code = m.pac_indicator_code
  JOIN public.indicator_regional_values pac ON pac.indicator_id = ei_pac.id
    AND pac.uf_code = pmc.uf_code
    AND EXTRACT(YEAR FROM pac.reference_date) = EXTRACT(YEAR FROM pmc.reference_date)
  WHERE ei_pmc.code LIKE 'PMC_%';

  RETURN QUERY
  SELECT
    pv.pmc_indicator_code::text,
    COUNT(*)::integer as records_inserted
  FROM public.pmc_valores_reais pv
  GROUP BY pv.pmc_indicator_code
  ORDER BY pv.pmc_indicator_code;
END;
$$;