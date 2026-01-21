-- Fix complete_pwa_registration_with_code (the overload used by PWARegister.tsx)
-- This is the ROOT CAUSE of "function gen_random_bytes(integer) does not exist"

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
AS $function$
DECLARE
  v_invitation RECORD;
  v_device RECORD;
  v_session_token TEXT;
  v_pwa_access TEXT[];
BEGIN
  -- 1. Find invitation by token AND verification code
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE invitation_token = p_invitation_token
    AND verification_code = p_verification_code
    AND status IN ('pending', 'form_submitted')
    AND expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Código de verificação inválido ou expirado'
    );
  END IF;

  -- 2. Get or create pwa_device
  SELECT * INTO v_device
  FROM pwa_devices
  WHERE device_fingerprint = p_device_id;

  IF v_device IS NULL THEN
    INSERT INTO pwa_devices (
      device_fingerprint,
      user_email,
      user_name,
      phone,
      user_agent,
      status,
      is_verified,
      verified_at
    ) VALUES (
      p_device_id,
      v_invitation.email,
      v_invitation.name,
      v_invitation.phone,
      p_user_agent,
      'verified',
      true,
      now()
    )
    RETURNING * INTO v_device;
  ELSE
    UPDATE pwa_devices SET
      user_email = v_invitation.email,
      user_name = v_invitation.name,
      phone = COALESCE(v_invitation.phone, phone),
      user_agent = COALESCE(p_user_agent, user_agent),
      status = 'verified',
      is_verified = true,
      verified_at = now(),
      updated_at = now()
    WHERE device_fingerprint = p_device_id
    RETURNING * INTO v_device;
  END IF;

  -- 3. Generate session token with ROBUST fallback
  BEGIN
    v_session_token := encode(extensions.gen_random_bytes(32), 'hex');
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: deterministic token using md5
    v_session_token := md5(random()::text || clock_timestamp()::text || p_device_id) ||
                       md5(random()::text || v_invitation.email || v_invitation.name);
    RAISE NOTICE 'gen_random_bytes failed, using md5 fallback for session token';
  END;

  -- 4. Get pwa_access
  v_pwa_access := COALESCE(v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias']);

  -- 5. Create or update pwa_session
  INSERT INTO pwa_sessions (
    device_id,
    user_name,
    token,
    pwa_access,
    has_app_access,
    is_active,
    expires_at
  ) VALUES (
    p_device_id,
    v_invitation.name,
    v_session_token,
    v_pwa_access,
    true,
    true,
    now() + interval '30 days'
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    token = EXCLUDED.token,
    pwa_access = EXCLUDED.pwa_access,
    has_app_access = EXCLUDED.has_app_access,
    is_active = true,
    expires_at = now() + interval '30 days',
    last_interaction = now();

  -- 6. Update invitation status
  UPDATE user_invitations SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = v_invitation.id;

  -- 7. Return success
  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
    'user_name', v_invitation.name,
    'user_email', v_invitation.email,
    'pwa_access', v_pwa_access,
    'device_id', p_device_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao completar registro: ' || SQLERRM
  );
END;
$function$;

-- Also protect register_pwa_user (preventative fix)
CREATE OR REPLACE FUNCTION public.register_pwa_user(
  p_invitation_token text,
  p_device_id text,
  p_name text,
  p_email text,
  p_phone text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_invitation RECORD;
  v_device RECORD;
  v_session_token TEXT;
  v_verification_code TEXT;
  v_pwa_access TEXT[];
BEGIN
  -- 1. Validate invitation token
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE invitation_token = p_invitation_token
    AND status IN ('pending', 'sent')
    AND has_app_access = true
    AND expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite inválido ou expirado'
    );
  END IF;

  -- 2. Generate verification code with ROBUST fallback
  BEGIN
    v_verification_code := LPAD(floor(extensions.gen_random_bytes(3)::int % 1000000)::text, 6, '0');
  EXCEPTION WHEN OTHERS THEN
    v_verification_code := LPAD(floor(random() * 1000000)::text, 6, '0');
    RAISE NOTICE 'gen_random_bytes failed for verification code, using random fallback';
  END;

  -- 3. Update invitation with form data
  UPDATE user_invitations SET
    name = COALESCE(p_name, name),
    email = COALESCE(lower(p_email), email),
    phone = COALESCE(p_phone, phone),
    verification_code = v_verification_code,
    verification_expires_at = now() + interval '10 minutes',
    status = 'form_submitted',
    updated_at = now()
  WHERE id = v_invitation.id
  RETURNING * INTO v_invitation;

  -- 4. Get or create pwa_device (pending verification)
  SELECT * INTO v_device
  FROM pwa_devices
  WHERE device_fingerprint = p_device_id;

  IF v_device IS NULL THEN
    INSERT INTO pwa_devices (
      device_fingerprint,
      user_email,
      user_name,
      phone,
      user_agent,
      status,
      is_verified
    ) VALUES (
      p_device_id,
      lower(p_email),
      p_name,
      p_phone,
      p_user_agent,
      'pending_verification',
      false
    )
    RETURNING * INTO v_device;
  ELSE
    UPDATE pwa_devices SET
      user_email = lower(p_email),
      user_name = p_name,
      phone = COALESCE(p_phone, phone),
      user_agent = COALESCE(p_user_agent, user_agent),
      status = 'pending_verification',
      updated_at = now()
    WHERE device_fingerprint = p_device_id
    RETURNING * INTO v_device;
  END IF;

  -- 5. Return success with verification code (to be sent via WhatsApp/SMS)
  RETURN jsonb_build_object(
    'success', true,
    'requires_verification', true,
    'verification_code', v_verification_code,
    'phone', COALESCE(p_phone, v_invitation.phone),
    'name', p_name,
    'email', lower(p_email),
    'device_id', p_device_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao registrar: ' || SQLERRM
  );
END;
$function$;