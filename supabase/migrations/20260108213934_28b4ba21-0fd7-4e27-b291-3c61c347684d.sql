-- Substituir função get_pwa_users_aggregated com filtro exato de company
CREATE OR REPLACE FUNCTION get_pwa_users_aggregated(
  p_search TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'last_activity',
  p_sort_direction TEXT DEFAULT 'desc',
  p_page_size INT DEFAULT 10,
  p_page INT DEFAULT 1
)
RETURNS TABLE (
  device_id TEXT,
  user_name TEXT,
  user_email TEXT,
  company TEXT,
  company_source TEXT,
  last_activity TIMESTAMPTZ,
  total_sessions BIGINT,
  modules_used TEXT[],
  total_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH aggregated AS (
    SELECT 
      s.device_id,
      (ARRAY_AGG(s.user_name ORDER BY s.started_at DESC) FILTER (WHERE s.user_name IS NOT NULL))[1] AS user_name,
      (ARRAY_AGG(s.user_email ORDER BY s.started_at DESC) FILTER (WHERE s.user_email IS NOT NULL))[1] AS user_email,
      (ARRAY_AGG(s.company ORDER BY s.started_at DESC) FILTER (WHERE s.company IS NOT NULL))[1] AS company,
      (ARRAY_AGG(s.company_source ORDER BY s.started_at DESC) FILTER (WHERE s.company_source IS NOT NULL))[1] AS company_source,
      MAX(s.started_at) AS last_activity,
      COUNT(*)::BIGINT AS total_sessions,
      ARRAY_AGG(DISTINCT s.module_type) AS modules_used
    FROM pwa_conversation_sessions s
    WHERE 
      (p_search IS NULL OR s.user_name ILIKE '%' || p_search || '%')
      AND (p_company IS NULL OR s.company = p_company)
      AND (p_date_from IS NULL OR s.started_at >= p_date_from)
      AND (p_date_to IS NULL OR s.started_at <= p_date_to)
    GROUP BY s.device_id
  ),
  counted AS (
    SELECT *, COUNT(*) OVER() AS total_count FROM aggregated
  )
  SELECT 
    c.device_id,
    c.user_name,
    c.user_email,
    c.company,
    c.company_source,
    c.last_activity,
    c.total_sessions,
    c.modules_used,
    c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN p_sort_column = 'last_activity' AND p_sort_direction = 'desc' THEN c.last_activity END DESC,
    CASE WHEN p_sort_column = 'last_activity' AND p_sort_direction = 'asc' THEN c.last_activity END ASC,
    CASE WHEN p_sort_column = 'user_name' AND p_sort_direction = 'desc' THEN c.user_name END DESC,
    CASE WHEN p_sort_column = 'user_name' AND p_sort_direction = 'asc' THEN c.user_name END ASC,
    CASE WHEN p_sort_column = 'company' AND p_sort_direction = 'desc' THEN c.company END DESC,
    CASE WHEN p_sort_column = 'company' AND p_sort_direction = 'asc' THEN c.company END ASC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

COMMENT ON FUNCTION get_pwa_users_aggregated IS 
'Retorna usuários PWA agregados por device_id com filtros, ordenação e paginação.
Parâmetros:
- p_search: busca parcial em user_name (ILIKE)
- p_company: filtro EXATO em company (igualdade)
- p_date_from/p_date_to: filtro de período em started_at
- p_sort_column: user_name, company ou last_activity
- p_sort_direction: asc ou desc
- p_page_size/p_page: paginação';