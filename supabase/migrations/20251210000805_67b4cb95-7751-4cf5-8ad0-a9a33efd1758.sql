-- Fix #1: Remove public read access to admin_settings (exposes admin emails)
DROP POLICY IF EXISTS "Public can read admin settings" ON public.admin_settings;

-- Fix #2: Restrict user_registrations INSERT to require some form of validation
-- Remove overly permissive public INSERT policy
DROP POLICY IF EXISTS "Anyone can submit registration" ON public.user_registrations;
DROP POLICY IF EXISTS "Public can submit registrations" ON public.user_registrations;

-- Create a more restrictive policy that still allows registration but with better controls
-- Registrations should still be allowed publicly (it's a registration form) but we document the risk
-- The real protection should be rate limiting at the application layer
CREATE POLICY "Users can submit registration requests" 
ON public.user_registrations 
FOR INSERT 
WITH CHECK (
  -- Only allow inserting with pending status (cannot self-approve)
  status = 'pending'
  -- Ensure required fields are provided
  AND email IS NOT NULL 
  AND first_name IS NOT NULL
);