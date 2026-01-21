-- Update indicator_stats_summary to include PAC estimated values (2024-2025)
DROP VIEW IF EXISTS public.indicator_stats_summary;

CREATE OR REPLACE VIEW public.indicator_stats_summary AS
WITH national_stats AS (
  SELECT 
    iv.indicator_id,
    COUNT(*) AS record_count,
    MIN(iv.reference_date) AS min_date,
    MAX(iv.reference_date) AS max_date,
    (SELECT iv2.value FROM indicator_values iv2 
     WHERE iv2.indicator_id = iv.indicator_id 
     ORDER BY iv2.reference_date DESC LIMIT 1) AS last_value
  FROM indicator_values iv
  GROUP BY iv.indicator_id
), 
regional_stats AS (
  SELECT 
    ir.indicator_id,
    COUNT(*) AS record_count,
    MIN(ir.reference_date) AS min_date,
    MAX(ir.reference_date) AS max_date,
    (SELECT ir2.value FROM indicator_regional_values ir2 
     WHERE ir2.indicator_id = ir.indicator_id 
     ORDER BY ir2.reference_date DESC LIMIT 1) AS last_value
  FROM indicator_regional_values ir
  GROUP BY ir.indicator_id
),
pac_estimated_stats AS (
  SELECT 
    pe.pac_indicator_id AS indicator_id,
    COUNT(*) AS record_count,
    MIN(pe.reference_date) AS min_date,
    MAX(pe.reference_date) AS max_date,
    (SELECT pe2.valor_estimado FROM pac_valores_estimados pe2 
     WHERE pe2.pac_indicator_id = pe.pac_indicator_id 
     ORDER BY pe2.reference_date DESC LIMIT 1) AS last_value
  FROM pac_valores_estimados pe
  WHERE pe.pac_indicator_id IS NOT NULL
  GROUP BY pe.pac_indicator_id
)
SELECT 
  COALESCE(n.indicator_id, r.indicator_id, p.indicator_id) AS indicator_id,
  COALESCE(n.record_count, 0::bigint) + COALESCE(r.record_count, 0::bigint) + COALESCE(p.record_count, 0::bigint) AS total_count,
  LEAST(n.min_date, r.min_date, p.min_date) AS min_date,
  GREATEST(n.max_date, r.max_date, p.max_date) AS max_date,
  COALESCE(
    CASE 
      WHEN COALESCE(n.max_date, '1900-01-01'::date) >= COALESCE(r.max_date, '1900-01-01'::date) 
           AND COALESCE(n.max_date, '1900-01-01'::date) >= COALESCE(p.max_date, '1900-01-01'::date) THEN n.last_value
      WHEN COALESCE(r.max_date, '1900-01-01'::date) >= COALESCE(p.max_date, '1900-01-01'::date) THEN r.last_value
      ELSE p.last_value
    END,
    n.last_value, r.last_value, p.last_value
  ) AS last_value
FROM national_stats n
FULL JOIN regional_stats r ON n.indicator_id = r.indicator_id
FULL JOIN pac_estimated_stats p ON COALESCE(n.indicator_id, r.indicator_id) = p.indicator_id;