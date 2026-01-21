-- Add tracking columns for invitation opens
ALTER TABLE public.user_invitations 
ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;