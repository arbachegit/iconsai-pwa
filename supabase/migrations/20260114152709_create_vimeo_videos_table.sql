-- ============================================
-- Migration: Create vimeo_videos table
-- Date: 2026-01-14
-- Description: Table for managing Vimeo videos in the platform
-- ============================================

-- Create the vimeo_videos table
CREATE TABLE IF NOT EXISTS public.vimeo_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  vimeo_id TEXT NOT NULL UNIQUE,
  thumbnail_url TEXT,
  duration INTEGER,
  category TEXT DEFAULT 'geral',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.vimeo_videos IS 'Stores Vimeo video references for the platform';
COMMENT ON COLUMN public.vimeo_videos.vimeo_id IS 'The unique Vimeo video ID (from URL)';
COMMENT ON COLUMN public.vimeo_videos.duration IS 'Video duration in seconds';
COMMENT ON COLUMN public.vimeo_videos.category IS 'Video category for organization';

-- Enable RLS
ALTER TABLE public.vimeo_videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to active videos"
  ON public.vimeo_videos
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow authenticated users full access"
  ON public.vimeo_videos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vimeo_videos_category ON public.vimeo_videos(category);
CREATE INDEX IF NOT EXISTS idx_vimeo_videos_vimeo_id ON public.vimeo_videos(vimeo_id);
CREATE INDEX IF NOT EXISTS idx_vimeo_videos_is_active ON public.vimeo_videos(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_vimeo_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_vimeo_videos_updated_at
  BEFORE UPDATE ON public.vimeo_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vimeo_videos_updated_at();
