-- Add new columns to security_shield_config for violation attempts and popup toggle
ALTER TABLE public.security_shield_config 
ADD COLUMN IF NOT EXISTS max_violation_attempts integer NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS show_violation_popup boolean NOT NULL DEFAULT true;