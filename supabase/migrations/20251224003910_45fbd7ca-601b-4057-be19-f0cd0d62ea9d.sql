-- Add address fields to user_registrations table
ALTER TABLE public.user_registrations
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS street_number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_registrations_status ON public.user_registrations(status);
CREATE INDEX IF NOT EXISTS idx_user_registrations_email ON public.user_registrations(email);

-- Ensure pgcrypto extension is enabled for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update register_pwa_user function with robust fallback
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
  v_device RECORD;
  v_user_id UUID;
  v_session_token TEXT;
  v_session_expires TIMESTAMPTZ;
  v_first_name TEXT;
  v_last_name TEXT;
  v_name_parts TEXT[];
BEGIN
  -- 1. Validate and get invitation
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE token = p_invitation_token
    AND (has_app_access = true OR pwa_access IS NOT NULL);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite não encontrado ou sem acesso ao APP'
    );
  END IF;
  
  -- Check if expired
  IF v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite expirado'
    );
  END IF;
  
  -- 2. Parse name
  v_name_parts := string_to_array(trim(p_name), ' ');
  v_first_name := v_name_parts[1];
  v_last_name := CASE 
    WHEN array_length(v_name_parts, 1) > 1 
    THEN array_to_string(v_name_parts[2:], ' ')
    ELSE ''
  END;
  
  -- 3. Create or update user_registrations
  INSERT INTO public.user_registrations (
    first_name, last_name, email, phone, role, status,
    pwa_registered_at, has_app_access, registration_source
  )
  VALUES (
    v_first_name, v_last_name, lower(p_email), p_phone, 
    COALESCE(v_invitation.role, 'user'), 'approved',
    NOW(), true, 'pwa_invite'
  )
  ON CONFLICT (email) DO UPDATE SET
    pwa_registered_at = NOW(),
    has_app_access = true,
    phone = COALESCE(EXCLUDED.phone, user_registrations.phone)
  RETURNING id INTO v_user_id;
  
  -- 4. Generate session token with robust fallback
  BEGIN
    SELECT encode(gen_random_bytes(32), 'hex') INTO v_session_token;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: use md5 with random + timestamp
    v_session_token := md5(random()::text || clock_timestamp()::text || p_device_id) || 
                       md5(random()::text || p_email || p_name);
  END;
  
  v_session_expires := NOW() + INTERVAL '30 days';
  
  -- 5. Create or update device
  INSERT INTO public.pwa_devices (
    device_fingerprint, user_registration_id, user_agent, is_trusted, last_seen_at
  )
  VALUES (
    p_device_id, v_user_id, p_user_agent, true, NOW()
  )
  ON CONFLICT (device_fingerprint) DO UPDATE SET
    user_registration_id = v_user_id,
    user_agent = COALESCE(EXCLUDED.user_agent, pwa_devices.user_agent),
    is_trusted = true,
    last_seen_at = NOW()
  RETURNING * INTO v_device;
  
  -- 6. Create session
  INSERT INTO public.pwa_sessions (
    session_token, device_id, expires_at, is_active
  )
  VALUES (
    v_session_token, v_device.id, v_session_expires, true
  )
  ON CONFLICT (session_token) DO UPDATE SET
    expires_at = v_session_expires,
    is_active = true;
  
  -- 7. Update invitation status
  UPDATE public.user_invitations
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE token = p_invitation_token;
  
  -- 8. Return success
  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
    'expires_at', v_session_expires,
    'user_id', v_user_id,
    'device_id', v_device.id,
    'user_name', p_name,
    'user_email', p_email
  );
END;
$$;

-- Create complete_pwa_registration as alias
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
  RETURN register_pwa_user(p_invitation_token, p_device_id, p_name, p_email, p_phone, p_user_agent);
END;
$$;