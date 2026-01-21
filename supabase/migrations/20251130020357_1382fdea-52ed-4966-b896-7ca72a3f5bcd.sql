-- Create RPC function to safely extract database schema information
CREATE OR REPLACE FUNCTION public.get_schema_info()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  WITH tables_info AS (
    SELECT 
      t.table_name,
      (
        SELECT json_agg(json_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default
        ) ORDER BY c.ordinal_position)
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
        AND c.table_name = t.table_name
      ) as columns,
      COALESCE(pt.rowsecurity, false) as rls_enabled,
      (
        SELECT json_agg(json_build_object(
          'policy_name', pol.policyname,
          'command', pol.cmd,
          'permissive', pol.permissive,
          'using_expression', pol.qual::text,
          'with_check_expression', pol.with_check::text
        ))
        FROM pg_policies pol
        WHERE pol.schemaname = 'public' 
        AND pol.tablename = t.table_name
      ) as policies
    FROM information_schema.tables t
    LEFT JOIN pg_tables pt 
      ON pt.schemaname = 'public' 
      AND pt.tablename = t.table_name
    WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  )
  SELECT json_agg(tables_info) INTO result FROM tables_info;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;