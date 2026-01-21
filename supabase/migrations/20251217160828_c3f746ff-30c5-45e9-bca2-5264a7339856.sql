-- Update the PMC conversion function to not insert into generated columns
DROP FUNCTION IF EXISTS public.process_all_pmc_conversions_batch();

CREATE OR REPLACE FUNCTION public.process_all_pmc_conversions_batch()
RETURNS TABLE(
  pmc_code text, 
  total_processed bigint, 
  total_converted bigint,
  years_covered text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Clear existing conversions for recalculation
  DELETE FROM public.pmc_valores_reais;
  
  -- Insert converted PMC values (excluding generated columns reference_year/reference_month)
  INSERT INTO public.pmc_valores_reais (
    pmc_indicator_id,
    pmc_indicator_code,
    uf_code,
    reference_date,
    indice_pmc_original,
    pac_receita_anual,
    pac_receita_mensal_media,
    valor_estimado_reais,
    pac_year_used,
    pac_year_extrapolated,
    calculation_method
  )
  SELECT 
    ei_pmc.id as pmc_indicator_id,
    ei_pmc.code as pmc_indicator_code,
    irv.uf_code,
    irv.reference_date,
    irv.value as indice_pmc_original,
    pac.valor_estimado as pac_receita_anual,
    pac.valor_estimado / 12.0 as pac_receita_mensal_media,
    (irv.value / 100.0) * (pac.valor_estimado / 12.0) as valor_estimado_reais,
    pac.reference_year as pac_year_used,
    pac.is_extrapolated as pac_year_extrapolated,
    CASE 
      WHEN pac.is_extrapolated THEN 'pmc_to_reais_estimated_pac'
      ELSE 'pmc_to_reais_actual_pac'
    END as calculation_method
  FROM public.indicator_regional_values irv
  JOIN public.economic_indicators ei_pmc ON ei_pmc.id = irv.indicator_id
  JOIN public.pac_pmc_mapping m ON m.pmc_indicator_code = ei_pmc.code AND m.is_active = true
  JOIN public.pac_valores_estimados pac 
    ON pac.pac_indicator_code = m.pac_indicator_code
    AND pac.uf_code = irv.uf_code
    AND pac.reference_year = EXTRACT(YEAR FROM irv.reference_date)::INTEGER
  WHERE ei_pmc.code LIKE 'PMC_%'
    AND irv.value IS NOT NULL
    AND irv.value > 0;
  
  -- Return summary by PMC indicator
  RETURN QUERY
  SELECT 
    pv.pmc_indicator_code,
    COUNT(*)::bigint as total_processed,
    COUNT(CASE WHEN pv.valor_estimado_reais IS NOT NULL THEN 1 END)::bigint as total_converted,
    MIN(EXTRACT(YEAR FROM pv.reference_date))::text || '-' || MAX(EXTRACT(YEAR FROM pv.reference_date))::text as years_covered
  FROM public.pmc_valores_reais pv
  GROUP BY pv.pmc_indicator_code
  ORDER BY pv.pmc_indicator_code;
END;
$function$;