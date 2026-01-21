-- ============================================
-- PWA AUTH v2.0 - Migration
-- ============================================

-- 1. ADD MISSING COLUMNS TO pwa_user_devices
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS invitation_id UUID;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS registration_id UUID;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}';
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ;
ALTER TABLE pwa_user_devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. CREATE UNIQUE INDEX FOR ON CONFLICT SUPPORT
CREATE UNIQUE INDEX IF NOT EXISTS idx_pwa_user_devices_device_id 
ON pwa_user_devices(device_id);

-- 3. ADD COLUMN COMMENTS
COMMENT ON COLUMN pwa_user_devices.expires_at IS 'Data de expiracao do acesso (90 dias apos verificacao)';
COMMENT ON COLUMN pwa_user_devices.is_verified IS 'Se o dispositivo foi verificado por OTP';
COMMENT ON COLUMN pwa_user_devices.verification_code IS 'Codigo OTP de 6 digitos (temporario)';

-- 4. FUNCTION: check_pwa_access
CREATE OR REPLACE FUNCTION check_pwa_access(
  p_device_id TEXT,
  p_agent_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
BEGIN
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE device_id = p_device_id
  LIMIT 1;

  IF v_device IS NULL THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', true,
      'needs_verification', false,
      'is_blocked', false,
      'reason', 'device_not_found'
    );
  END IF;

  IF v_device.is_blocked = true THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', false,
      'needs_verification', false,
      'is_blocked', true,
      'reason', 'device_blocked'
    );
  END IF;

  IF v_device.is_verified = false THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', false,
      'needs_verification', true,
      'is_blocked', false,
      'reason', 'not_verified'
    );
  END IF;

  IF v_device.expires_at IS NOT NULL AND v_device.expires_at < NOW() THEN
    UPDATE pwa_user_devices
    SET is_verified = false
    WHERE id = v_device.id;

    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', true,
      'needs_verification', false,
      'is_blocked', false,
      'reason', 'access_expired'
    );
  END IF;

  UPDATE pwa_user_devices
  SET last_access_at = NOW()
  WHERE id = v_device.id;

  RETURN jsonb_build_object(
    'has_access', true,
    'needs_login', false,
    'needs_verification', false,
    'is_blocked', false,
    'reason', null,
    'device_id', v_device.id,
    'user_name', v_device.user_name,
    'expires_at', v_device.expires_at
  );
END;
$$;

-- 5. FUNCTION: login_pwa_by_phone
CREATE OR REPLACE FUNCTION login_pwa_by_phone(
  p_phone TEXT,
  p_fingerprint TEXT,
  p_device_info JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_clean TEXT;
  v_invitation RECORD;
  v_registration RECORD;
  v_device RECORD;
  v_code TEXT;
  v_user_name TEXT;
  v_invitation_id UUID;
  v_registration_id UUID;
BEGIN
  v_phone_clean := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  IF length(v_phone_clean) = 10 OR length(v_phone_clean) = 11 THEN
    v_phone_clean := '55' || v_phone_clean;
  END IF;

  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE device_id = p_fingerprint
  LIMIT 1;

  IF v_device IS NOT NULL THEN
    IF v_device.is_blocked THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'device_blocked',
        'message', 'Este dispositivo está bloqueado.'
      );
    END IF;

    IF v_device.is_verified = true AND (v_device.expires_at IS NULL OR v_device.expires_at > NOW()) THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_verified', true,
        'message', 'Dispositivo já verificado.'
      );
    END IF;

    v_user_name := v_device.user_name;
    v_invitation_id := v_device.invitation_id;
    v_registration_id := v_device.registration_id;
  ELSE
    SELECT * INTO v_invitation
    FROM user_invitations
    WHERE (phone = p_phone OR phone = v_phone_clean OR phone = '+' || v_phone_clean)
      AND has_app_access = true
      AND status IN ('pending', 'form_submitted', 'verification_sent')
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT * INTO v_registration
    FROM user_registrations
    WHERE (phone = p_phone OR phone = v_phone_clean OR phone = '+' || v_phone_clean)
      AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invitation IS NULL AND v_registration IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'no_invitation',
        'message', 'Você precisa de um convite para acessar o PWA. Solicite ao administrador.'
      );
    END IF;

    IF v_invitation IS NOT NULL THEN
      v_user_name := v_invitation.name;
      v_invitation_id := v_invitation.id;
    ELSE
      v_user_name := v_registration.name;
      v_registration_id := v_registration.id;
    END IF;
  END IF;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  INSERT INTO pwa_user_devices (
    device_id,
    phone,
    user_name,
    verification_code,
    verification_code_expires_at,
    verification_attempts,
    is_verified,
    invitation_id,
    registration_id,
    device_info,
    created_at,
    updated_at
  )
  VALUES (
    p_fingerprint,
    v_phone_clean,
    v_user_name,
    v_code,
    NOW() + INTERVAL '10 minutes',
    0,
    false,
    v_invitation_id,
    v_registration_id,
    p_device_info,
    NOW(),
    NOW()
  )
  ON CONFLICT (device_id) DO UPDATE SET
    phone = EXCLUDED.phone,
    verification_code = EXCLUDED.verification_code,
    verification_code_expires_at = EXCLUDED.verification_code_expires_at,
    verification_attempts = 0,
    is_verified = false,
    updated_at = NOW();

  IF v_invitation_id IS NOT NULL THEN
    UPDATE user_invitations
    SET status = 'verification_sent',
        verification_sent_at = NOW()
    WHERE id = v_invitation_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'verification_code', v_code,
    'user_name', v_user_name,
    'phone', v_phone_clean,
    'message', 'Código de verificação gerado. Válido por 10 minutos.'
  );
END;
$$;

-- 6. FUNCTION: verify_pwa_device_code
CREATE OR REPLACE FUNCTION verify_pwa_device_code(
  p_fingerprint TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE device_id = p_fingerprint
  LIMIT 1;

  IF v_device IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_not_found',
      'message', 'Dispositivo não encontrado. Inicie o processo novamente.'
    );
  END IF;

  IF v_device.is_blocked = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_blocked',
      'message', 'Este dispositivo está bloqueado.'
    );
  END IF;

  IF v_device.verification_code_expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'code_expired',
      'message', 'Código expirado. Solicite um novo código.'
    );
  END IF;

  IF v_device.verification_attempts >= 5 THEN
    UPDATE pwa_user_devices
    SET is_blocked = true,
        blocked_reason = 'Excedeu tentativas de verificação',
        updated_at = NOW()
    WHERE id = v_device.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'max_attempts',
      'message', 'Máximo de tentativas excedido. Dispositivo bloqueado.'
    );
  END IF;

  IF v_device.verification_code != p_code THEN
    UPDATE pwa_user_devices
    SET verification_attempts = verification_attempts + 1,
        updated_at = NOW()
    WHERE id = v_device.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido. Tente novamente.',
      'attempts_remaining', 5 - (v_device.verification_attempts + 1)
    );
  END IF;

  v_expires_at := NOW() + INTERVAL '90 days';

  UPDATE pwa_user_devices
  SET is_verified = true,
      verified_at = NOW(),
      expires_at = v_expires_at,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_attempts = 0,
      last_access_at = NOW(),
      updated_at = NOW()
  WHERE id = v_device.id;

  IF v_device.invitation_id IS NOT NULL THEN
    UPDATE user_invitations
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_device.invitation_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Dispositivo verificado com sucesso!',
    'user_name', v_device.user_name,
    'expires_at', v_expires_at
  );
END;
$$;

-- 7. FUNCTION: resend_pwa_verification_code
CREATE OR REPLACE FUNCTION resend_pwa_verification_code(
  p_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_code TEXT;
BEGIN
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE device_id = p_fingerprint
  LIMIT 1;

  IF v_device IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_not_found',
      'message', 'Dispositivo não encontrado.'
    );
  END IF;

  IF v_device.is_blocked = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_blocked',
      'message', 'Este dispositivo está bloqueado.'
    );
  END IF;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  UPDATE pwa_user_devices
  SET verification_code = v_code,
      verification_code_expires_at = NOW() + INTERVAL '10 minutes',
      verification_attempts = 0,
      updated_at = NOW()
  WHERE id = v_device.id;

  RETURN jsonb_build_object(
    'success', true,
    'verification_code', v_code,
    'phone', v_device.phone,
    'message', 'Novo código gerado. Válido por 10 minutos.'
  );
END;
$$;

-- 8. GRANTS
GRANT EXECUTE ON FUNCTION check_pwa_access(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_pwa_by_phone(TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_pwa_device_code(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION resend_pwa_verification_code(TEXT) TO anon, authenticated;