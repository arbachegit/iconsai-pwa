-- Add separate tracking columns for platform and app modalities
ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS platform_first_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS platform_last_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS platform_open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS app_first_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS app_last_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS app_open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS app_completed_at TIMESTAMPTZ;