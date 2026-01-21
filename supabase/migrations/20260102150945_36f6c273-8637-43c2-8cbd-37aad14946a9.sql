-- Fix SECURITY DEFINER views by recreating with SECURITY INVOKER

-- Recreate crm_metrics view with SECURITY INVOKER
DROP VIEW IF EXISTS crm_metrics;
CREATE VIEW crm_metrics WITH (security_invoker = on) AS
SELECT
  salesman_id,
  COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS visits_today,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS visits_this_month,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted_count,
  COUNT(*) AS total_visits,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) AS conversion_rate,
  AVG(duration_seconds) AS avg_duration_seconds
FROM crm_visits
GROUP BY salesman_id;

-- Recreate top_knowledge view with SECURITY INVOKER
DROP VIEW IF EXISTS top_knowledge;
CREATE VIEW top_knowledge WITH (security_invoker = on) AS
SELECT
  id,
  query,
  LEFT(answer, 200) AS answer_preview,
  source_name,
  source_type,
  auto_tags,
  usage_count,
  confidence,
  verified,
  last_used_at
FROM deep_search_knowledge
ORDER BY usage_count DESC
LIMIT 100;