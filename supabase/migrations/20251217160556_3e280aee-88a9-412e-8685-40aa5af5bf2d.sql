-- Drop and recreate the function with fixed column naming
DROP FUNCTION IF EXISTS public.process_pac_estimation_batch();

CREATE OR REPLACE FUNCTION public.process_pac_estimation_batch()
RETURNS TABLE(indicator_code text, records_inserted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max_pac_year INTEGER;
  v_indicator RECORD;
  v_count INTEGER;
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
    SELECT 
      ei.id as ind_id,
      ei.code as ind_code,
      irv.uf_code as uf_cd,
      MAX(CASE WHEN EXTRACT(YEAR FROM irv.reference_date) = v_max_pac_year - 3 THEN irv.value END) as value_t_minus_3,
      MAX(CASE WHEN EXTRACT(YEAR FROM irv.reference_date) = v_max_pac_year THEN irv.value END) as value_latest,
      v_max_pac_year as latest_yr
    FROM public.indicator_regional_values irv
    JOIN public.economic_indicators ei ON ei.id = irv.indicator_id
    WHERE ei.code LIKE 'PAC_%'
      AND EXTRACT(YEAR FROM irv.reference_date) IN (v_max_pac_year - 3, v_max_pac_year)
    GROUP BY ei.id, ei.code, irv.uf_code
    HAVING MAX(CASE WHEN EXTRACT(YEAR FROM irv.reference_date) = v_max_pac_year THEN irv.value END) IS NOT NULL
  ),
  cagr_calculated AS (
    SELECT 
      gr.ind_id,
      gr.ind_code,
      gr.uf_cd,
      gr.value_latest,
      gr.latest_yr,
      CASE 
        WHEN gr.value_t_minus_3 > 0 AND gr.value_latest > 0 THEN
          POWER(gr.value_latest / gr.value_t_minus_3, 1.0/3.0) - 1
        ELSE 0.05
      END as cagr
    FROM growth_rates gr
    WHERE gr.value_latest IS NOT NULL
  )
  SELECT
    cc.ind_id,
    cc.ind_code,
    cc.uf_cd,
    MAKE_DATE(cc.latest_yr + year_offset, 1, 1),
    cc.latest_yr + year_offset,
    cc.value_latest,
    cc.value_latest * POWER(1 + LEAST(cc.cagr, 0.20), year_offset),
    LEAST(cc.cagr, 0.20),
    cc.latest_yr,
    true,
    'cagr_3y'
  FROM cagr_calculated cc
  CROSS JOIN generate_series(1, 2) as year_offset
  WHERE cc.cagr IS NOT NULL;

  -- Return summary per indicator
  FOR v_indicator IN 
    SELECT DISTINCT pac_indicator_code as code FROM public.pac_valores_estimados WHERE is_extrapolated = true
  LOOP
    SELECT COUNT(*) INTO v_count 
    FROM public.pac_valores_estimados 
    WHERE pac_indicator_code = v_indicator.code AND is_extrapolated = true;
    
    indicator_code := v_indicator.code;
    records_inserted := v_count;
    RETURN NEXT;
  END LOOP;
END;
$function$;