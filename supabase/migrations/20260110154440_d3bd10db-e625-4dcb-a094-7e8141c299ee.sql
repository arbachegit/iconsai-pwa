-- ============================================
-- PWA Auth SQL Functions v2.0 - CORRECTED
-- Aligns with existing pwa_devices table structure
-- Data: 2026-01-10
-- ============================================

-- 1. Add missing columns to pwa_devices
ALTER TABLE pwa_devices 
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE pwa_devices
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE pwa_devices
ADD COLUMN IF NOT EXISTS pwa_access TEXT[];

ALTER TABLE pwa_devices
ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ;

ALTER TABLE pwa_devices
ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES user_invitations(id);

ALTER TABLE pwa_devices
ADD COLUMN IF NOT EXISTS registration_id UUID;

ALTER TABLE pwa_devices
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

ALTER TABLE pwa_devices
ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;

-- 2. Copy existing data to new columns
UPDATE pwa_devices SET 
  phone = phone_number,
  email = user_email,
  pwa_access = pwa_slugs,
  last_access_at = last_active_at,
  registration_id = user_registration_id,
  verification_attempts = COALESCE(failed_verification_attempts, 0),
  verification_code_expires_at = verification_expires_at
WHERE phone IS NULL OR phone = '';

-- 3. Create unique index on fingerprint column for UPSERT
CREATE UNIQUE INDEX IF NOT EXISTS idx_pwa_devices_fingerprint 
ON pwa_devices(device_fingerprint);

-- 4. FUNCTION: check_pwa_access (FIXED)
CREATE OR REPLACE FUNCTION check_pwa_access(
  p_device_id TEXT,
  p_agent_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_device
  FROM pwa_devices
  WHERE device_fingerprint = p_device_id;
  
  IF v_device IS NULL THEN
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'reason', 'device_not_found',
      'needs_login', TRUE
    );
  END IF;
  
  IF v_device.is_blocked THEN
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'is_blocked', TRUE,
      'block_reason', v_device.block_reason
    );
  END IF;
  
  IF NOT COALESCE(v_device.is_verified, FALSE) THEN
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'needs_verification', TRUE,
      'user_phone', COALESCE(v_device.phone, v_device.phone_number)
    );
  END IF;
  
  IF v_device.expires_at IS NOT NULL AND v_device.expires_at < v_now THEN
    UPDATE pwa_devices
    SET is_verified = FALSE, updated_at = v_now
    WHERE id = v_device.id;
    
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'reason', 'expired',
      'needs_login', TRUE,
      'user_phone', COALESCE(v_device.phone, v_device.phone_number)
    );
  END IF;
  
  UPDATE pwa_devices
  SET last_active_at = v_now, updated_at = v_now
  WHERE id = v_device.id;
  
  RETURN jsonb_build_object(
    'has_access', TRUE,
    'user_id', v_device.id,
    'user_name', v_device.user_name,
    'pwa_access', COALESCE(v_device.pwa_access, v_device.pwa_slugs)
  );
END;
$$;

-- 5. FUNCTION: login_pwa_by_phone (FIXED)
CREATE OR REPLACE FUNCTION login_pwa_by_phone(
  p_phone TEXT,
  p_fingerprint TEXT,
  p_device_info JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_registration RECORD;
  v_existing_device RECORD;
  v_phone_clean TEXT;
  v_code TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_user_name TEXT;
  v_user_email TEXT;
  v_pwa_access TEXT[];
BEGIN
  v_phone_clean := regexp_replace(p_phone, '[^0-9+]', '', 'g');
  IF NOT v_phone_clean LIKE '+%' THEN
    IF LENGTH(v_phone_clean) IN (10, 11) THEN
      v_phone_clean := '+55' || v_phone_clean;
    END IF;
  END IF;
  
  SELECT * INTO v_existing_device
  FROM pwa_devices
  WHERE device_fingerprint = p_fingerprint 
    AND is_verified = TRUE
    AND (expires_at IS NULL OR expires_at > v_now);
  
  IF v_existing_device IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'already_verified', TRUE,
      'user_name', v_existing_device.user_name
    );
  END IF;
  
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE phone = v_phone_clean
    AND status IN ('pending', 'form_submitted')
    AND expires_at > v_now
    AND has_app_access = TRUE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_invitation IS NULL THEN
    SELECT * INTO v_registration
    FROM user_registrations
    WHERE phone = v_phone_clean
      AND status = 'approved'
      AND has_app_access = TRUE
    LIMIT 1;
  END IF;
  
  IF v_invitation IS NULL AND v_registration IS NULL THEN
    SELECT * INTO v_existing_device
    FROM pwa_devices
    WHERE (phone = v_phone_clean OR phone_number = v_phone_clean)
      AND is_verified = TRUE
    LIMIT 1;
    
    IF v_existing_device IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'no_invitation',
        'message', 'Nao encontramos um convite para este telefone. Voce precisa de um convite para acessar o KnowYOU.'
      );
    END IF;
    
    v_user_name := v_existing_device.user_name;
    v_user_email := COALESCE(v_existing_device.email, v_existing_device.user_email);
    v_pwa_access := COALESCE(v_existing_device.pwa_access, v_existing_device.pwa_slugs);
  ELSE
    v_user_name := COALESCE(v_invitation.name, v_registration.name);
    v_user_email := COALESCE(v_invitation.email, v_registration.email);
    v_pwa_access := COALESCE(v_invitation.pwa_access, v_registration.pwa_access, ARRAY['economia', 'health', 'ideias']);
  END IF;
  
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  INSERT INTO pwa_devices (
    device_fingerprint, 
    phone,
    phone_number,
    email,
    user_email,
    user_name,
    invitation_id, 
    user_registration_id,
    verification_code, 
    verification_code_expires_at,
    verification_expires_at,
    verification_attempts,
    failed_verification_attempts,
    is_verified, 
    pwa_access,
    pwa_slugs,
    os_name, 
    os_version, 
    browser_name, 
    browser_version,
    device_vendor, 
    device_model, 
    screen_width, 
    screen_height,
    pixel_ratio, 
    has_touch, 
    has_microphone, 
    user_agent,
    created_at,
    updated_at
  )
  VALUES (
    p_fingerprint, 
    v_phone_clean,
    v_phone_clean,
    v_user_email,
    v_user_email,
    v_user_name,
    v_invitation.id, 
    v_registration.id,
    v_code, 
    v_now + INTERVAL '10 minutes',
    v_now + INTERVAL '10 minutes',
    0,
    0,
    FALSE,
    v_pwa_access,
    v_pwa_access,
    (p_device_info->>'os_name'),
    (p_device_info->>'os_version'),
    (p_device_info->>'browser_name'),
    (p_device_info->>'browser_version'),
    (p_device_info->>'device_vendor'),
    (p_device_info->>'device_model'),
    (p_device_info->>'screen_width')::INTEGER,
    (p_device_info->>'screen_height')::INTEGER,
    (p_device_info->>'pixel_ratio')::NUMERIC,
    (p_device_info->>'has_touch')::BOOLEAN,
    (p_device_info->>'has_microphone')::BOOLEAN,
    (p_device_info->>'user_agent'),
    v_now,
    v_now
  )
  ON CONFLICT (device_fingerprint) DO UPDATE SET
    phone = EXCLUDED.phone,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    user_email = EXCLUDED.user_email,
    user_name = EXCLUDED.user_name,
    invitation_id = EXCLUDED.invitation_id,
    user_registration_id = EXCLUDED.user_registration_id,
    verification_code = EXCLUDED.verification_code,
    verification_code_expires_at = EXCLUDED.verification_code_expires_at,
    verification_expires_at = EXCLUDED.verification_expires_at,
    verification_attempts = 0,
    failed_verification_attempts = 0,
    is_verified = FALSE,
    pwa_access = EXCLUDED.pwa_access,
    pwa_slugs = EXCLUDED.pwa_slugs,
    updated_at = v_now;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'verification_code', v_code,
    'user_name', v_user_name
  );
END;
$$;

-- 6. FUNCTION: verify_pwa_device_code (FIXED)
CREATE OR REPLACE FUNCTION verify_pwa_device_code(
  p_fingerprint TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_expires_at TIMESTAMPTZ;
  v_attempts INTEGER;
BEGIN
  SELECT * INTO v_device
  FROM pwa_devices
  WHERE device_fingerprint = p_fingerprint;
  
  IF v_device IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'device_not_found');
  END IF;
  
  IF v_device.is_blocked THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'blocked');
  END IF;
  
  v_attempts := COALESCE(v_device.verification_attempts, v_device.failed_verification_attempts, 0);
  
  IF v_attempts >= 5 THEN
    UPDATE pwa_devices
    SET is_blocked = TRUE, 
        block_reason = 'Excesso de tentativas de verificacao', 
        updated_at = v_now
    WHERE id = v_device.id;
    
    RETURN jsonb_build_object('success', FALSE, 'error', 'too_many_attempts');
  END IF;
  
  IF COALESCE(v_device.verification_code_expires_at, v_device.verification_expires_at) < v_now THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'code_expired');
  END IF;
  
  IF v_device.verification_code != p_code THEN
    UPDATE pwa_devices
    SET verification_attempts = v_attempts + 1,
        failed_verification_attempts = v_attempts + 1,
        updated_at = v_now
    WHERE id = v_device.id;
    
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'invalid_code',
      'attempts_remaining', 5 - v_attempts - 1
    );
  END IF;
  
  v_expires_at := v_now + INTERVAL '90 days';
  
  UPDATE pwa_devices
  SET is_verified = TRUE,
      verified_at = v_now,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_expires_at = NULL,
      verification_attempts = 0,
      failed_verification_attempts = 0,
      expires_at = v_expires_at,
      last_active_at = v_now,
      updated_at = v_now
  WHERE id = v_device.id;
  
  IF v_device.invitation_id IS NOT NULL THEN
    UPDATE user_invitations
    SET status = 'completed', 
        pwa_registered_at = v_now, 
        updated_at = v_now
    WHERE id = v_device.invitation_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'user_name', v_device.user_name,
    'pwa_access', COALESCE(v_device.pwa_access, v_device.pwa_slugs),
    'expires_at', v_expires_at
  );
END;
$$;

-- 7. GRANTS
GRANT EXECUTE ON FUNCTION check_pwa_access(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_pwa_by_phone(TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_pwa_device_code(TEXT, TEXT) TO anon, authenticated;