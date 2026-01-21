-- Ensure pgcrypto is enabled for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update register_pwa_user function with fallback for gen_random_bytes
CREATE OR REPLACE FUNCTION public.register_pwa_user(
  p_invitation_token TEXT,
  p_device_id TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_session_token TEXT;
  v_session_expires TIMESTAMPTZ;
BEGIN
  -- 1. Verify invitation
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE token = p_invitation_token
    AND status IN ('pending', 'form_submitted')
    AND expires_at > NOW()
    AND has_app_access = TRUE;
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido, expirado ou sem acesso ao APP');
  END IF;
  
  -- 2. Create or update user registration
  INSERT INTO public.user_registrations (
    first_name,
    last_name,
    email,
    phone,
    role,
    status,
    pwa_access,
    pwa_registered_at,
    invitation_token,
    invitation_id,
    has_app_access
  )
  VALUES (
    split_part(p_name, ' ', 1),
    CASE WHEN position(' ' in p_name) > 0 
      THEN substring(p_name from position(' ' in p_name) + 1)
      ELSE ''
    END,
    LOWER(p_email),
    p_phone,
    v_invitation.role,
    'approved',
    COALESCE(v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias']),
    NOW(),
    p_invitation_token,
    v_invitation.id,
    TRUE
  )
  ON CONFLICT (email) DO UPDATE SET
    pwa_access = COALESCE(EXCLUDED.pwa_access, user_registrations.pwa_access),
    pwa_registered_at = NOW(),
    phone = COALESCE(EXCLUDED.phone, user_registrations.phone),
    has_app_access = TRUE
  RETURNING id INTO v_user_id;
  
  -- 3. Generate session token with fallback
  BEGIN
    SELECT encode(gen_random_bytes(32), 'hex') INTO v_session_token;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: use md5 with random + timestamp
    v_session_token := md5(random()::text || clock_timestamp()::text || p_device_id) || 
                       md5(random()::text || p_email || p_name);
  END;
  
  v_session_expires := NOW() + INTERVAL '30 days';
  
  -- 4. Create or update pwa_session
  INSERT INTO public.pwa_sessions (
    device_id,
    user_id,
    user_name,
    token,
    pwa_access,
    expires_at,
    is_active,
    last_interaction
  )
  VALUES (
    p_device_id,
    v_user_id,
    p_name,
    v_session_token,
    COALESCE(v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias']),
    v_session_expires,
    TRUE,
    NOW()
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    user_name = EXCLUDED.user_name,
    token = EXCLUDED.token,
    pwa_access = EXCLUDED.pwa_access,
    expires_at = EXCLUDED.expires_at,
    is_active = TRUE,
    last_interaction = NOW();
  
  -- 5. Update invitation
  UPDATE public.user_invitations
  SET 
    status = 'completed',
    app_completed_at = NOW(),
    updated_at = NOW()
  WHERE token = p_invitation_token;
  
  -- 6. Register device
  INSERT INTO public.pwa_devices (
    device_id,
    user_id,
    user_agent,
    is_verified,
    last_seen,
    created_at
  )
  VALUES (
    p_device_id,
    v_user_id,
    p_user_agent,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    user_agent = COALESCE(EXCLUDED.user_agent, pwa_devices.user_agent),
    is_verified = TRUE,
    last_seen = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cadastro realizado com sucesso!',
    'session_token', v_session_token,
    'expires_at', v_session_expires,
    'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY['economia', 'health', 'ideias'])
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update complete_pwa_registration to delegate to register_pwa_user
CREATE OR REPLACE FUNCTION public.complete_pwa_registration(
  p_invitation_token TEXT,
  p_device_id TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delegate to register_pwa_user
  RETURN register_pwa_user(p_invitation_token, p_device_id, p_name, p_email, p_phone, p_user_agent);
END;
$$;