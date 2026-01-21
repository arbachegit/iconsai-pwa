-- Create security severity change history table
CREATE TABLE public.security_severity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_level TEXT NOT NULL,
  new_level TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES auth.users(id),
  changed_by_email TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_severity_history ENABLE ROW LEVEL SECURITY;

-- Only admins can read history
CREATE POLICY "Admins can read severity history"
ON public.security_severity_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System/admins can insert history
CREATE POLICY "Admins can insert severity history"
ON public.security_severity_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_severity_history_created_at ON public.security_severity_history(created_at DESC);