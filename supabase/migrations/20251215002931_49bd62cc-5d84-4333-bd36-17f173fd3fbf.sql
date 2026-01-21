-- Create view for aggregated indicator statistics to avoid loading all data
CREATE OR REPLACE VIEW indicator_stats_summary AS
WITH national_stats AS (
  SELECT 
    indicator_id,
    COUNT(*) as record_count,
    MIN(reference_date) as min_date,
    MAX(reference_date) as max_date,
    (SELECT value FROM indicator_values iv2 WHERE iv2.indicator_id = iv.indicator_id ORDER BY reference_date DESC LIMIT 1) as last_value
  FROM indicator_values iv
  GROUP BY indicator_id
),
regional_stats AS (
  SELECT 
    indicator_id,
    COUNT(*) as record_count,
    MIN(reference_date) as min_date,
    MAX(reference_date) as max_date,
    (SELECT value FROM indicator_regional_values ir2 WHERE ir2.indicator_id = ir.indicator_id ORDER BY reference_date DESC LIMIT 1) as last_value
  FROM indicator_regional_values ir
  GROUP BY indicator_id
)
SELECT 
  COALESCE(n.indicator_id, r.indicator_id) as indicator_id,
  COALESCE(n.record_count, 0) + COALESCE(r.record_count, 0) as total_count,
  LEAST(n.min_date, r.min_date) as min_date,
  GREATEST(n.max_date, r.max_date) as max_date,
  COALESCE(
    CASE WHEN n.max_date >= COALESCE(r.max_date, '1900-01-01') THEN n.last_value ELSE r.last_value END,
    n.last_value,
    r.last_value
  ) as last_value
FROM national_stats n
FULL OUTER JOIN regional_stats r ON n.indicator_id = r.indicator_id;