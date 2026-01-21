-- Fix complete_pwa_registration_with_code to use extensions.gen_random_bytes with fallback
-- This fixes the error: "function gen_random_bytes(integer) does not exist"

CREATE OR REPLACE FUNCTION public.complete_pwa_registration_with_code(
  p_device_id text,
  p_name text,
  p_email text,
  p_phone text DEFAULT NULL,
  p_verification_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invitation record;
  v_registration record;
  v_device record;
  v_session_token text;
  v_device_uuid uuid;
  v_pwa_access text[];
BEGIN
  -- 1. Find the invitation by verification code (if provided) or email
  IF p_verification_code IS NOT NULL THEN
    SELECT * INTO v_invitation 
    FROM user_invitations 
    WHERE verification_code = p_verification_code 
      AND status IN ('form_submitted', 'pending')
      AND expires_at > now()
    LIMIT 1;
    
    IF v_invitation IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Código de verificação inválido ou expirado');
    END IF;
  ELSE
    -- Fallback: find by email
    SELECT * INTO v_invitation 
    FROM user_invitations 
    WHERE email = lower(p_email)
      AND status IN ('form_submitted', 'pending')
      AND has_app_access = true
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_invitation IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Convite não encontrado para este email');
    END IF;
  END IF;

  -- 2. Get or create user_registration
  SELECT * INTO v_registration
  FROM user_registrations
  WHERE email = lower(p_email);
  
  IF v_registration IS NULL THEN
    INSERT INTO user_registrations (
      first_name, last_name, email, phone, status,
      has_platform_access, has_app_access, pwa_access,
      registration_source, pwa_registered_at
    ) VALUES (
      split_part(p_name, ' ', 1),
      CASE WHEN position(' ' in p_name) > 0 THEN substring(p_name from position(' ' in p_name) + 1) ELSE '' END,
      lower(p_email),
      COALESCE(p_phone, v_invitation.phone),
      'approved',
      v_invitation.has_platform_access,
      v_invitation.has_app_access,
      COALESCE(v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias']),
      'pwa',
      now()
    )
    RETURNING * INTO v_registration;
  ELSE
    UPDATE user_registrations SET
      has_app_access = true,
      pwa_access = COALESCE(v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias']),
      pwa_registered_at = now(),
      phone = COALESCE(p_phone, phone, v_invitation.phone),
      updated_at = now()
    WHERE id = v_registration.id
    RETURNING * INTO v_registration;
  END IF;

  -- 3. Get or create pwa_device
  SELECT * INTO v_device FROM pwa_devices WHERE device_fingerprint = p_device_id;
  
  IF v_device IS NULL THEN
    INSERT INTO pwa_devices (
      device_fingerprint, user_id, user_email, user_name, 
      phone, status, is_verified, verified_at
    ) VALUES (
      p_device_id, v_registration.id, lower(p_email), p_name,
      COALESCE(p_phone, v_invitation.phone), 'verified', true, now()
    )
    RETURNING * INTO v_device;
    v_device_uuid := v_device.id;
  ELSE
    UPDATE pwa_devices SET
      user_id = v_registration.id,
      user_email = lower(p_email),
      user_name = p_name,
      phone = COALESCE(p_phone, phone, v_invitation.phone),
      status = 'verified',
      is_verified = true,
      verified_at = now(),
      updated_at = now()
    WHERE device_fingerprint = p_device_id
    RETURNING * INTO v_device;
    v_device_uuid := v_device.id;
  END IF;

  -- 4. Generate session token - FIXED: use extensions.gen_random_bytes with fallback
  BEGIN
    v_session_token := encode(extensions.gen_random_bytes(32), 'hex');
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: use md5 with random + timestamp if gen_random_bytes fails
    v_session_token := md5(random()::text || clock_timestamp()::text || p_device_id) || 
                       md5(random()::text || p_email || p_name);
    RAISE NOTICE 'gen_random_bytes failed, using md5 fallback for session token';
  END;

  -- 5. Get pwa_access from registration or invitation
  v_pwa_access := COALESCE(v_registration.pwa_access, v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias']);

  -- 6. Create pwa_session
  INSERT INTO pwa_sessions (
    device_id,
    user_name,
    user_id,
    token,
    pwa_access,
    has_app_access,
    is_active,
    expires_at
  ) VALUES (
    p_device_id,
    p_name,
    v_registration.id,
    v_session_token,
    v_pwa_access,
    true,
    true,
    now() + interval '30 days'
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    user_id = EXCLUDED.user_id,
    token = EXCLUDED.token,
    pwa_access = EXCLUDED.pwa_access,
    has_app_access = EXCLUDED.has_app_access,
    is_active = true,
    expires_at = now() + interval '30 days',
    last_interaction = now();

  -- 7. Update invitation status
  UPDATE user_invitations SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = v_invitation.id;

  -- 8. Return success
  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
    'user_name', p_name,
    'user_email', lower(p_email),
    'pwa_access', v_pwa_access,
    'device_id', p_device_id,
    'registration_id', v_registration.id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao completar registro: ' || SQLERRM
  );
END;
$$;

-- Also fix register_pwa_user to ensure it uses extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION public.register_pwa_user(
  p_device_id text,
  p_name text,
  p_email text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invitation record;
  v_registration record;
  v_device record;
  v_session_token text;
  v_pwa_access text[];
BEGIN
  -- 1. Find valid invitation for email
  SELECT * INTO v_invitation 
  FROM user_invitations 
  WHERE email = lower(p_email)
    AND status IN ('pending', 'form_submitted')
    AND has_app_access = true
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum convite válido encontrado para este email');
  END IF;

  -- 2. Get or create user_registration
  SELECT * INTO v_registration
  FROM user_registrations
  WHERE email = lower(p_email);
  
  IF v_registration IS NULL THEN
    INSERT INTO user_registrations (
      first_name, last_name, email, phone, status,
      has_platform_access, has_app_access, pwa_access,
      registration_source, pwa_registered_at
    ) VALUES (
      split_part(p_name, ' ', 1),
      CASE WHEN position(' ' in p_name) > 0 THEN substring(p_name from position(' ' in p_name) + 1) ELSE '' END,
      lower(p_email),
      COALESCE(p_phone, v_invitation.phone),
      'approved',
      v_invitation.has_platform_access,
      v_invitation.has_app_access,
      COALESCE(v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias']),
      'pwa',
      now()
    )
    RETURNING * INTO v_registration;
  ELSE
    UPDATE user_registrations SET
      has_app_access = true,
      pwa_access = COALESCE(v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias']),
      pwa_registered_at = now(),
      phone = COALESCE(p_phone, phone, v_invitation.phone),
      updated_at = now()
    WHERE id = v_registration.id
    RETURNING * INTO v_registration;
  END IF;

  -- 3. Get or create pwa_device
  SELECT * INTO v_device FROM pwa_devices WHERE device_fingerprint = p_device_id;
  
  IF v_device IS NULL THEN
    INSERT INTO pwa_devices (
      device_fingerprint, user_id, user_email, user_name, 
      phone, status, is_verified
    ) VALUES (
      p_device_id, v_registration.id, lower(p_email), p_name,
      COALESCE(p_phone, v_invitation.phone), 'pending', false
    )
    RETURNING * INTO v_device;
  ELSE
    UPDATE pwa_devices SET
      user_id = v_registration.id,
      user_email = lower(p_email),
      user_name = p_name,
      phone = COALESCE(p_phone, phone, v_invitation.phone),
      updated_at = now()
    WHERE device_fingerprint = p_device_id
    RETURNING * INTO v_device;
  END IF;

  -- 4. Generate session token - FIXED: use extensions.gen_random_bytes with fallback
  BEGIN
    v_session_token := encode(extensions.gen_random_bytes(32), 'hex');
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: use md5 with random + timestamp if gen_random_bytes fails
    v_session_token := md5(random()::text || clock_timestamp()::text || p_device_id) || 
                       md5(random()::text || p_email || p_name);
    RAISE NOTICE 'gen_random_bytes failed, using md5 fallback for session token';
  END;

  -- 5. Get pwa_access
  v_pwa_access := COALESCE(v_registration.pwa_access, v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias']);

  -- 6. Create/update pwa_session
  INSERT INTO pwa_sessions (
    device_id,
    user_name,
    user_id,
    token,
    pwa_access,
    has_app_access,
    is_active,
    expires_at
  ) VALUES (
    p_device_id,
    p_name,
    v_registration.id,
    v_session_token,
    v_pwa_access,
    true,
    true,
    now() + interval '30 days'
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    user_id = EXCLUDED.user_id,
    token = EXCLUDED.token,
    pwa_access = EXCLUDED.pwa_access,
    has_app_access = EXCLUDED.has_app_access,
    is_active = true,
    expires_at = now() + interval '30 days',
    last_interaction = now();

  -- 7. Update invitation status
  UPDATE user_invitations SET
    status = 'form_submitted',
    updated_at = now()
  WHERE id = v_invitation.id;

  -- 8. Return success
  RETURN jsonb_build_object(
    'success', true,
    'needs_verification', true,
    'session_token', v_session_token,
    'user_name', p_name,
    'user_email', lower(p_email),
    'pwa_access', v_pwa_access,
    'device_id', p_device_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao registrar: ' || SQLERRM
  );
END;
$$;