-- Drop and recreate the function to combine historical PAC + estimated PAC
CREATE OR REPLACE FUNCTION public.process_all_pmc_conversions_batch()
RETURNS TABLE(pmc_code text, total_processed bigint, total_converted bigint, years_covered text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Clear existing conversions for recalculation
  DELETE FROM public.pmc_valores_reais;
  
  -- Insert converted PMC values using COMBINED PAC data sources
  -- SOURCE 1: Historical PAC from indicator_regional_values (2007-2023)
  -- SOURCE 2: Estimated PAC from pac_valores_estimados (2024-2025)
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
  WITH pac_historico AS (
    -- Historical PAC data from indicator_regional_values (actual data 2007-2023)
    SELECT 
      ei.code as pac_indicator_code,
      irv.uf_code,
      EXTRACT(YEAR FROM irv.reference_date)::INTEGER as reference_year,
      irv.value as receita_anual,
      false as is_extrapolated
    FROM public.indicator_regional_values irv
    JOIN public.economic_indicators ei ON ei.id = irv.indicator_id
    WHERE ei.code LIKE 'PAC_%'
  ),
  pac_estimado AS (
    -- Estimated PAC data from pac_valores_estimados (projections 2024-2025)
    SELECT 
      pac_indicator_code,
      uf_code,
      reference_year,
      valor_estimado as receita_anual,
      is_extrapolated
    FROM public.pac_valores_estimados
  ),
  pac_completo AS (
    -- Combine both sources, preferring historical data when available
    SELECT DISTINCT ON (pac_indicator_code, uf_code, reference_year)
      pac_indicator_code,
      uf_code,
      reference_year,
      receita_anual,
      is_extrapolated
    FROM (
      SELECT * FROM pac_historico
      UNION ALL
      SELECT * FROM pac_estimado
    ) combined
    ORDER BY pac_indicator_code, uf_code, reference_year, is_extrapolated ASC
  ),
  pmc_data AS (
    -- Get PMC regional values with their indicator IDs
    SELECT 
      ei.id as pmc_indicator_id,
      ei.code as pmc_indicator_code,
      irv.uf_code,
      irv.reference_date,
      EXTRACT(YEAR FROM irv.reference_date)::INTEGER as pmc_year,
      irv.value as indice_pmc
    FROM public.indicator_regional_values irv
    JOIN public.economic_indicators ei ON ei.id = irv.indicator_id
    WHERE ei.code LIKE 'PMC_%'
      AND ei.code NOT LIKE 'PAC_%'
  ),
  pmc_with_pac_mapping AS (
    -- Map PMC indicators to their PAC counterparts
    SELECT 
      p.pmc_indicator_id,
      p.pmc_indicator_code,
      p.uf_code,
      p.reference_date,
      p.pmc_year,
      p.indice_pmc,
      m.pac_indicator_code
    FROM pmc_data p
    JOIN public.pac_pmc_mapping m ON m.pmc_indicator_code = p.pmc_indicator_code
    WHERE m.is_active = true
  ),
  pmc_with_pac_value AS (
    -- Join PMC data with PAC values (same year or closest previous year)
    SELECT 
      pw.pmc_indicator_id,
      pw.pmc_indicator_code,
      pw.uf_code,
      pw.reference_date,
      pw.indice_pmc,
      pc.receita_anual as pac_receita_anual,
      pc.reference_year as pac_year_used,
      pc.is_extrapolated as pac_year_extrapolated
    FROM pmc_with_pac_mapping pw
    JOIN LATERAL (
      -- Find PAC value for the same year, or closest previous year
      SELECT receita_anual, reference_year, is_extrapolated
      FROM pac_completo
      WHERE pac_indicator_code = pw.pac_indicator_code
        AND uf_code = pw.uf_code
        AND reference_year <= pw.pmc_year
      ORDER BY reference_year DESC
      LIMIT 1
    ) pc ON true
  )
  SELECT 
    pmc_indicator_id,
    pmc_indicator_code,
    uf_code,
    reference_date,
    indice_pmc,
    pac_receita_anual,
    pac_receita_anual / 12.0 as pac_receita_mensal_media,
    (indice_pmc / 100.0) * (pac_receita_anual / 12.0) as valor_estimado_reais,
    pac_year_used,
    pac_year_extrapolated,
    'pmc_index_x_pac_monthly'::text as calculation_method
  FROM pmc_with_pac_value
  WHERE pac_receita_anual IS NOT NULL 
    AND pac_receita_anual > 0
    AND indice_pmc IS NOT NULL;

  -- Return summary per PMC indicator
  RETURN QUERY
  SELECT 
    pvr.pmc_indicator_code::text as pmc_code,
    COUNT(*)::bigint as total_processed,
    COUNT(CASE WHEN pvr.valor_estimado_reais IS NOT NULL THEN 1 END)::bigint as total_converted,
    (MIN(EXTRACT(YEAR FROM pvr.reference_date))::integer || '-' || MAX(EXTRACT(YEAR FROM pvr.reference_date))::integer)::text as years_covered
  FROM public.pmc_valores_reais pvr
  GROUP BY pvr.pmc_indicator_code
  ORDER BY pvr.pmc_indicator_code;
END;
$function$;