-- Create security_scan_results table for storing automated scan history
CREATE TABLE public.security_scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scanner_type TEXT NOT NULL DEFAULT 'automated_daily',
  overall_status TEXT NOT NULL DEFAULT 'healthy',
  findings_summary JSONB NOT NULL DEFAULT '{"critical": 0, "warning": 0, "info": 0, "passed": 0}'::jsonb,
  detailed_report JSONB NOT NULL DEFAULT '[]'::jsonb,
  execution_duration_ms INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'system',
  alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create integrity_check_log table for code fragility checks
CREATE TABLE public.integrity_check_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_type TEXT NOT NULL,
  modules_checked TEXT[] DEFAULT '{}',
  issues_found JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.security_scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_check_log ENABLE ROW LEVEL SECURITY;

-- Create admin-only RLS policies for security_scan_results
CREATE POLICY "Admins can read security scan results"
ON public.security_scan_results
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert security scan results"
ON public.security_scan_results
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can delete security scan results"
ON public.security_scan_results
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin-only RLS policies for integrity_check_log
CREATE POLICY "Admins can read integrity check logs"
ON public.integrity_check_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert integrity check logs"
ON public.integrity_check_log
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can delete integrity check logs"
ON public.integrity_check_log
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add security alert configuration to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS security_scan_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS security_alert_email TEXT,
ADD COLUMN IF NOT EXISTS security_alert_threshold TEXT DEFAULT 'critical',
ADD COLUMN IF NOT EXISTS last_security_scan TIMESTAMP WITH TIME ZONE;