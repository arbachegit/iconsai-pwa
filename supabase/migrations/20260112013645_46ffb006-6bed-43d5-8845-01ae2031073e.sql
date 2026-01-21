-- ============================================
-- FIX: Add unique constraint on device_id for pwa_user_devices
-- Required for ON CONFLICT (device_id) in login_pwa_by_phone
-- ============================================

-- Remove duplicates if any exist (keep most recent by id)
DELETE FROM pwa_user_devices a
USING pwa_user_devices b
WHERE a.device_id = b.device_id
  AND a.id < b.id;

-- Add unique constraint on device_id only
ALTER TABLE pwa_user_devices 
ADD CONSTRAINT pwa_user_devices_device_id_unique 
UNIQUE (device_id);