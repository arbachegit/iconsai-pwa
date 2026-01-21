-- Fix chat_analytics RLS policy conflict
-- Remove the overly permissive public read policy that exposes PII (user_name, session_id, topics)

-- Drop the conflicting public read policy
DROP POLICY IF EXISTS "Allow public read of chat_analytics" ON public.chat_analytics;

-- Keep only these policies:
-- 1. "Only admins can read chat analytics" (already exists - admin read access)
-- 2. "Allow public insert into chat_analytics" (needed for anonymous session tracking)
-- 3. "Anyone can insert chat analytics" (needed for anonymous session tracking)
-- 4. "Anyone can update chat analytics" (needed for updating session stats)