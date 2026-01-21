-- Create system_api_registry table for API management
CREATE TABLE IF NOT EXISTS public.system_api_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  base_url TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_latency_ms INTEGER,
  target_table TEXT,
  last_http_status INTEGER,
  last_sync_metadata JSONB,
  last_raw_response JSONB,
  fetch_start_date TEXT,
  fetch_end_date TEXT,
  auto_fetch_enabled BOOLEAN DEFAULT false,
  auto_fetch_interval TEXT,
  discovered_period_start TEXT,
  discovered_period_end TEXT,
  source_data_status TEXT,
  source_data_message TEXT,
  last_response_at TIMESTAMP WITH TIME ZONE,
  period_discovery_date TIMESTAMP WITH TIME ZONE
);

-- Create indicator_stats_summary table
CREATE TABLE IF NOT EXISTS public.indicator_stats_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID,
  indicator_name TEXT,
  total_records INTEGER DEFAULT 0,
  last_value NUMERIC,
  last_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pmc_valores_reais table for economic data
CREATE TABLE IF NOT EXISTS public.pmc_valores_reais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_date TEXT NOT NULL,
  uf_code INTEGER NOT NULL,
  valor_estimado_reais NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create section_content_versions table
CREATE TABLE IF NOT EXISTS public.section_content_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID,
  content TEXT,
  version_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Create user_preferences table for sidebar favorites
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  sidebar_favorites JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notification_logs table if not exists
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  notification_type TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_templates table for contact messages
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  category TEXT,
  variables JSONB,
  variables_used TEXT[],
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.system_api_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_stats_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmc_valores_reais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (authenticated users can read/write)
CREATE POLICY "Allow authenticated read" ON public.system_api_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.system_api_registry FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.system_api_registry FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON public.system_api_registry FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.indicator_stats_summary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.pmc_valores_reais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.section_content_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated read" ON public.notification_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.notification_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.notification_logs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.email_templates FOR UPDATE TO authenticated USING (true);