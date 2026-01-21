-- Fix schema mismatch: user_invitations has completed_at (not accepted_at)
CREATE OR REPLACE FUNCTION public.complete_pwa_registration_with_code(
  p_invitation_token text,
  p_device_id text,
  p_verification_code text,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_session_token text;
BEGIN
  -- 1. Find and validate invitation using token
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_invitation_token
    AND status = 'verification_sent'
    AND verification_code = p_verification_code
  LIMIT 1;

  IF v_invitation IS NULL THEN
    -- Check if invitation exists but with different status
    SELECT * INTO v_invitation
    FROM user_invitations
    WHERE token = p_invitation_token
    LIMIT 1;

    IF v_invitation IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Convite não encontrado');
    END IF;

    IF v_invitation.status = 'completed' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este convite já foi utilizado');
    END IF;

    IF v_invitation.verification_code IS DISTINCT FROM p_verification_code THEN
      RETURN jsonb_build_object('success', false, 'error', 'Código de verificação incorreto');
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Status do convite inválido');
  END IF;

  -- 2. Check if verification code has expired
  IF v_invitation.verification_code_expires_at IS NOT NULL
     AND v_invitation.verification_code_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código expirado. Solicite um novo.');
  END IF;

  -- 3. Update invitation status to completed (correct column)
  UPDATE user_invitations
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = v_invitation.id;

  -- 4. Create or update pwa_device record
  INSERT INTO pwa_devices (
    device_fingerprint,
    phone_number,
    user_name,
    user_email,
    user_agent,
    is_verified,
    verified_at,
    pwa_slugs
  ) VALUES (
    p_device_id,
    v_invitation.phone,
    v_invitation.name,
    v_invitation.email,
    p_user_agent,
    true,
    now(),
    v_invitation.pwa_access
  )
  ON CONFLICT (device_fingerprint) DO UPDATE SET
    phone_number = EXCLUDED.phone_number,
    user_name = EXCLUDED.user_name,
    user_email = EXCLUDED.user_email,
    user_agent = COALESCE(EXCLUDED.user_agent, pwa_devices.user_agent),
    is_verified = true,
    verified_at = now(),
    pwa_slugs = EXCLUDED.pwa_slugs,
    updated_at = now();

  -- 5. Update user_registrations if exists
  UPDATE user_registrations
  SET pwa_registered_at = now(),
      has_app_access = true,
      updated_at = now()
  WHERE email = v_invitation.email;

  -- 6. Generate session token
  BEGIN
    v_session_token := encode(extensions.gen_random_bytes(32), 'hex');
  EXCEPTION WHEN OTHERS THEN
    v_session_token := md5(random()::text || clock_timestamp()::text || p_device_id);
  END;

  -- 7. Create or refresh PWA session
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
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    token = EXCLUDED.token,
    pwa_access = EXCLUDED.pwa_access,
    is_active = true,
    has_app_access = true,
    expires_at = EXCLUDED.expires_at;

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
    'user_name', v_invitation.name,
    'pwa_access', v_invitation.pwa_access,
    'message', 'Cadastro realizado com sucesso!'
  );
END;
$$;