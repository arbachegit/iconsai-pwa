-- Fix column names in complete_pwa_registration_with_code function
CREATE OR REPLACE FUNCTION public.complete_pwa_registration_with_code(
  p_invitation_token text,
  p_device_id text,
  p_verification_code text,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_invitation RECORD;
  v_device RECORD;
  v_session_token text;
  v_user_id uuid;
BEGIN
  -- 1. Validate invitation using correct column name (token, not invitation_token)
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_invitation_token
    AND status = 'sent'
  LIMIT 1;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite não encontrado ou já utilizado');
  END IF;

  -- 2. Validate device and code using correct column names
  SELECT * INTO v_device
  FROM pwa_devices
  WHERE device_id = p_device_id
    AND invitation_id = v_invitation.id
    AND verification_code = p_verification_code
    AND is_verified = false
  LIMIT 1;

  IF v_device IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de verificação inválido');
  END IF;

  -- Check expiration using correct column name (verification_code_expires_at)
  IF v_device.verification_code_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código expirado. Solicite um novo.');
  END IF;

  -- 3. Mark device as verified (no status column - use is_verified and verified_at)
  UPDATE pwa_devices
  SET is_verified = true,
      verified_at = now(),
      user_agent = COALESCE(p_user_agent, user_agent)
  WHERE id = v_device.id;

  -- 4. Update invitation status
  UPDATE user_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = v_invitation.id;

  -- 5. Update user_registrations if exists
  UPDATE user_registrations
  SET pwa_registered_at = now(),
      has_app_access = true
  WHERE email = v_invitation.email;

  -- 6. Generate session token with robust fallback
  BEGIN
    v_session_token := encode(extensions.gen_random_bytes(32), 'hex');
  EXCEPTION WHEN OTHERS THEN
    v_session_token := md5(random()::text || clock_timestamp()::text || p_device_id);
  END;

  -- 7. Create PWA session
  INSERT INTO pwa_sessions (
    device_id,
    user_name,
    token,
    pwa_access,
    is_active,
    has_app_access,
    expires_at
  ) VALUES (
    p_device_id,
    v_invitation.name,
    v_session_token,
    v_invitation.pwa_access,
    true,
    true,
    now() + interval '30 days'
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
    'user_name', v_invitation.name,
    'pwa_access', v_invitation.pwa_access
  );
END;
$$;

-- Fix column names in register_pwa_user function
CREATE OR REPLACE FUNCTION public.register_pwa_user(
  p_invitation_token text,
  p_device_id text,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_invitation RECORD;
  v_verification_code text;
  v_device_id uuid;
BEGIN
  -- 1. Validate invitation using correct column name (token, not invitation_token)
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_invitation_token
    AND status = 'sent'
  LIMIT 1;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  -- 2. Generate verification code with robust fallback
  BEGIN
    v_verification_code := lpad(abs(('x' || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6))::bit(24)::int % 1000000)::text, 6, '0');
  EXCEPTION WHEN OTHERS THEN
    v_verification_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  END;

  -- 3. Insert or update device with correct column names (phone_number, not phone; no status column)
  INSERT INTO pwa_devices (
    device_id,
    invitation_id,
    user_name,
    user_email,
    phone_number,
    user_agent,
    verification_code,
    verification_code_expires_at,
    is_verified
  ) VALUES (
    p_device_id,
    v_invitation.id,
    COALESCE(p_name, v_invitation.name),
    COALESCE(p_email, v_invitation.email),
    COALESCE(p_phone, v_invitation.phone),
    p_user_agent,
    v_verification_code,
    now() + interval '10 minutes',
    false
  )
  ON CONFLICT (device_id) DO UPDATE SET
    invitation_id = EXCLUDED.invitation_id,
    user_name = EXCLUDED.user_name,
    user_email = EXCLUDED.user_email,
    phone_number = EXCLUDED.phone_number,
    user_agent = EXCLUDED.user_agent,
    verification_code = EXCLUDED.verification_code,
    verification_code_expires_at = EXCLUDED.verification_code_expires_at,
    is_verified = false
  RETURNING id INTO v_device_id;

  RETURN jsonb_build_object(
    'success', true,
    'device_id', v_device_id,
    'verification_code', v_verification_code,
    'phone', COALESCE(p_phone, v_invitation.phone),
    'expires_in_minutes', 10
  );
END;
$$;