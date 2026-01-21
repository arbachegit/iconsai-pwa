-- =============================================
-- Migration: Create pwa_device_fingerprints table
-- Date: 2026-01-15
-- Purpose: Store device fingerprints for behavioral analysis
-- =============================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.pwa_device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  user_agent TEXT,
  platform TEXT,
  screen_size TEXT,
  timezone TEXT,
  touch_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_fingerprints_phone ON public.pwa_device_fingerprints(phone);
CREATE INDEX IF NOT EXISTS idx_fingerprints_fingerprint ON public.pwa_device_fingerprints(fingerprint);
CREATE INDEX IF NOT EXISTS idx_fingerprints_created_at ON public.pwa_device_fingerprints(created_at DESC);

-- Enable RLS
ALTER TABLE public.pwa_device_fingerprints ENABLE ROW LEVEL SECURITY;

-- Allow insert for all (anonymous for PWA)
CREATE POLICY IF NOT EXISTS "Allow insert fingerprints"
  ON public.pwa_device_fingerprints
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow select for authenticated users (admin)
CREATE POLICY IF NOT EXISTS "Allow select fingerprints for admin"
  ON public.pwa_device_fingerprints
  FOR SELECT
  TO authenticated
  USING (true);

-- Comment on table
COMMENT ON TABLE public.pwa_device_fingerprints IS 'Stores device fingerprints for PWA behavioral analysis';
