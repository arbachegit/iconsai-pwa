-- Drop the overly permissive policy that allows anonymous users to update tooltip audio URLs
-- This prevents content injection attacks
-- The existing 'Only admins can manage tooltips' policy already provides proper admin access

DROP POLICY IF EXISTS "Anyone can update audio_url in tooltips" ON public.tooltip_contents;