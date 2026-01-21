-- Create api_test_staging table for JSON testing workflow
CREATE TABLE public.api_test_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'BCB',
  base_url TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending_test' CHECK (status IN ('pending_test', 'tested', 'implemented', 'error')),
  is_functional BOOLEAN DEFAULT NULL,
  http_status INTEGER,
  error_message TEXT,
  discovered_period_start DATE,
  discovered_period_end DATE,
  last_raw_response JSONB,
  selected_variables JSONB DEFAULT '[]'::jsonb,
  all_variables JSONB DEFAULT '[]'::jsonb,
  implementation_params JSONB,
  test_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_test_staging ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only
CREATE POLICY "Admins can manage api_test_staging"
ON public.api_test_staging
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_api_test_staging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_api_test_staging_updated_at
BEFORE UPDATE ON public.api_test_staging
FOR EACH ROW
EXECUTE FUNCTION public.update_api_test_staging_updated_at();

-- Enable realtime for synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_test_staging;