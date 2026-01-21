-- Create security shield configuration table
CREATE TABLE IF NOT EXISTS public.security_shield_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shield_enabled boolean NOT NULL DEFAULT true,
  devtools_detection_enabled boolean NOT NULL DEFAULT true,
  right_click_block_enabled boolean NOT NULL DEFAULT true,
  keyboard_shortcuts_block_enabled boolean NOT NULL DEFAULT true,
  console_clear_enabled boolean NOT NULL DEFAULT true,
  iframe_detection_enabled boolean NOT NULL DEFAULT true,
  react_devtools_detection_enabled boolean NOT NULL DEFAULT true,
  text_selection_block_enabled boolean NOT NULL DEFAULT true,
  monitoring_interval_ms integer NOT NULL DEFAULT 500,
  console_clear_interval_ms integer NOT NULL DEFAULT 1000,
  auto_ban_on_violation boolean NOT NULL DEFAULT true,
  ban_duration_hours integer DEFAULT NULL,
  whitelisted_domains text[] NOT NULL DEFAULT ARRAY['localhost', '127.0.0.1', 'lovable.app', 'lovableproject.com', 'gptengineer.run', 'webcontainer.io'],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_shield_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage security config"
  ON public.security_shield_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Public can read security config"
  ON public.security_shield_config
  FOR SELECT
  USING (true);

-- Insert default configuration
INSERT INTO public.security_shield_config (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Add is_active column to banned_devices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banned_devices' 
    AND column_name = 'is_active'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.banned_devices ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Create index for active bans lookup
CREATE INDEX IF NOT EXISTS idx_banned_devices_active 
  ON public.banned_devices(device_fingerprint) 
  WHERE is_active = true;