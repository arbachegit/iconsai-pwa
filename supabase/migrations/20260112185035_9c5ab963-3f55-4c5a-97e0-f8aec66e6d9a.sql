-- Clean up duplicate pwa_user_devices records, keeping the most recent verified one
-- Step 1: Delete duplicates based on normalized phone (last 11 digits)
DELETE FROM pwa_user_devices 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY right(regexp_replace(phone, '[^0-9]', '', 'g'), 11)
        ORDER BY is_verified DESC, updated_at DESC NULLS LAST
      ) as rn
    FROM pwa_user_devices
  ) sub WHERE rn > 1
);

-- Step 2: Normalize all phone numbers to +55... format
UPDATE pwa_user_devices 
SET phone = '+55' || right(regexp_replace(phone, '[^0-9]', '', 'g'), 11)
WHERE phone NOT LIKE '+55%' 
   OR length(regexp_replace(phone, '[^0-9]', '', 'g')) != 13;