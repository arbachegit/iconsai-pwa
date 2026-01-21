-- ============================================
-- SECURITY FIX: pwa_devices unrestricted SELECT access
-- Issue: PUBLIC_DATA_EXPOSURE - RLS policy "Public can read own device by fingerprint" 
-- uses USING(true), exposing PII including phone numbers, emails, and verification codes.
-- ============================================

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can read own device by fingerprint" ON pwa_devices;

-- Step 2: Create a secure RLS policy that restricts access to:
-- a) Devices matching the x-device-fingerprint header (for PWA/mobile apps)
-- b) Authenticated users viewing their own device (user_id match)
-- c) Admins/superadmins for management
CREATE POLICY "Users can read own device by fingerprint or auth"
ON pwa_devices FOR SELECT
USING (
  -- Allow access if device fingerprint matches the header
  device_fingerprint = COALESCE(
    current_setting('request.headers', true)::json->>'x-device-fingerprint',
    ''
  )
  -- OR if authenticated user owns the device
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  -- OR if user is admin/superadmin
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);