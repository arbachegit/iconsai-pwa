-- ============================================
-- FIX 1: user_registrations - Add missing RLS policies
-- ============================================

-- Add SELECT policy - Only admins can read registrations
CREATE POLICY "Only admins can read user registrations"
ON public.user_registrations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Add UPDATE policy - Only admins can update registrations
CREATE POLICY "Only admins can update user registrations"
ON public.user_registrations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Add DELETE policy - Only superadmins can delete registrations
CREATE POLICY "Only superadmins can delete user registrations"
ON public.user_registrations
FOR DELETE
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- ============================================
-- FIX 2: password_recovery_codes - Fix UPDATE policy
-- ============================================

-- Drop the insecure policy
DROP POLICY IF EXISTS "System can update recovery codes" ON public.password_recovery_codes;

-- Create secure policy - Only service role (edge functions) can update
-- When auth.jwt() IS NULL, it means the request is from service role
CREATE POLICY "Service role can update recovery codes"
ON public.password_recovery_codes
FOR UPDATE
USING (auth.jwt() IS NULL);