-- Add RPC to audit SECURITY DEFINER functions (service-role only)

CREATE OR REPLACE FUNCTION public.get_security_definer_functions_audit()
RETURNS jsonb
LANGUAGE sql
SET search_path = public
AS $$
  WITH funcs AS (
    SELECT
      p.oid,
      n.nspname AS schema,
      p.proname AS name,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      p.prosecdef AS security_definer,
      CASE
        WHEN p.proconfig IS NULL THEN NULL
        ELSE (
          SELECT c
          FROM unnest(p.proconfig) AS c
          WHERE c LIKE 'search_path=%'
          LIMIT 1
        )
      END AS search_path_config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  ), normalized AS (
    SELECT
      oid,
      schema,
      name,
      identity_args,
      security_definer,
      search_path_config,
      (search_path_config IS NOT NULL) AS has_explicit_search_path,
      CASE
        WHEN search_path_config IS NULL THEN NULL
        ELSE regexp_replace(search_path_config, '^search_path=', '')
      END AS search_path_value,
      format('%I.%I(%s)', schema, name, identity_args) AS identifier
    FROM funcs
  )
  SELECT jsonb_build_object(
    'count', (SELECT count(*) FROM normalized),
    'missing_search_path_count', (SELECT count(*) FROM normalized WHERE has_explicit_search_path = false),
    'identifiers', COALESCE((SELECT jsonb_agg(identifier ORDER BY identifier) FROM normalized), '[]'::jsonb),
    'missing_search_path', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'identifier', identifier,
        'search_path_config', search_path_config
      ) ORDER BY identifier)
      FROM normalized
      WHERE has_explicit_search_path = false
    ), '[]'::jsonb)
  );
$$;

-- Restrict execution to service role only (prevents information disclosure)
REVOKE ALL ON FUNCTION public.get_security_definer_functions_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_security_definer_functions_audit() TO service_role;
