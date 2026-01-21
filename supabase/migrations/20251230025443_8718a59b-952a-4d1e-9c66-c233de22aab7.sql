-- Create schema_audit_log table for tracking schema divergences
CREATE TABLE IF NOT EXISTS public.schema_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL, -- 'table_column', 'function_signature', 'migration_status', 'rls_policy'
  entity_name TEXT NOT NULL, -- Name of the table/function being checked
  expected_state JSONB, -- Expected state from code
  actual_state JSONB, -- Actual state in database
  divergence_type TEXT NOT NULL, -- 'missing_column', 'wrong_type', 'function_mismatch', 'missing_table', etc.
  severity TEXT NOT NULL DEFAULT 'warning', -- 'critical', 'warning', 'info'
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schema_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage schema_audit_log"
  ON public.schema_audit_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert schema_audit_log"
  ON public.schema_audit_log FOR INSERT
  WITH CHECK (true);

-- Create index for quick lookups
CREATE INDEX idx_schema_audit_unresolved ON public.schema_audit_log (is_resolved, severity, created_at DESC);
CREATE INDEX idx_schema_audit_entity ON public.schema_audit_log (entity_name, check_type);

-- Create function to get schema info for a table
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable BOOLEAN,
  column_default TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    (c.is_nullable = 'YES')::BOOLEAN,
    c.column_default::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = p_table_name;
$$;

-- Create function to get function definition
CREATE OR REPLACE FUNCTION public.get_function_definition(p_function_name TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_get_functiondef(p.oid)::TEXT
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname = p_function_name
  LIMIT 1;
$$;

-- Create function to check if table exists
CREATE OR REPLACE FUNCTION public.table_exists(p_table_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = p_table_name
  );
$$;

-- Create function to check if function exists
CREATE OR REPLACE FUNCTION public.function_exists(p_function_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = p_function_name
  );
$$;