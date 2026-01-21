-- Create table for password recovery codes
CREATE TABLE public.password_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,
  is_used BOOLEAN DEFAULT false
);

-- Index for fast lookup
CREATE INDEX idx_recovery_codes_email_code ON public.password_recovery_codes(email, code);
CREATE INDEX idx_recovery_codes_email ON public.password_recovery_codes(email);

-- Enable RLS
ALTER TABLE public.password_recovery_codes ENABLE ROW LEVEL SECURITY;

-- System can manage recovery codes (via service role)
CREATE POLICY "System can insert recovery codes" ON public.password_recovery_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can read recovery codes" ON public.password_recovery_codes
  FOR SELECT USING (true);

CREATE POLICY "System can update recovery codes" ON public.password_recovery_codes
  FOR UPDATE USING (true);