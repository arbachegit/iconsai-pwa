-- 1. Drop and recreate status check constraint to include 'verification_sent'
ALTER TABLE public.user_invitations DROP CONSTRAINT IF EXISTS user_invitations_status_check;

ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_status_check 
CHECK (status IN ('pending', 'form_submitted', 'verification_sent', 'completed', 'expired', 'cancelled'));

-- 2. Drop and recreate verification_method constraint to include 'sms'
ALTER TABLE public.user_invitations DROP CONSTRAINT IF EXISTS user_invitations_verification_method_check;

ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_verification_method_check
CHECK (verification_method IS NULL OR verification_method IN ('email', 'whatsapp', 'sms'));

-- 3. Update verify_pwa_invitation function to accept verification_sent status and return more info
CREATE OR REPLACE FUNCTION public.verify_pwa_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_result jsonb;
BEGIN
  -- Find valid invitation (pending, form_submitted, or verification_sent)
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_token
    AND status IN ('pending', 'form_submitted', 'verification_sent')
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    -- Check if expired
    SELECT * INTO v_invitation
    FROM user_invitations
    WHERE token = p_token
    LIMIT 1;
    
    IF FOUND THEN
      IF v_invitation.status = 'completed' THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Este convite já foi utilizado');
      ELSIF v_invitation.status IN ('cancelled', 'expired') OR v_invitation.expires_at <= now() THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Este convite expirou');
      END IF;
    END IF;
    
    RETURN jsonb_build_object('valid', false, 'error', 'Convite não encontrado');
  END IF;

  -- Return invitation data with status info
  v_result := jsonb_build_object(
    'valid', true,
    'invitation_id', v_invitation.id,
    'name', v_invitation.name,
    'email', v_invitation.email,
    'phone', v_invitation.phone,
    'role', v_invitation.role,
    'pwa_access', v_invitation.pwa_access,
    'expires_at', v_invitation.expires_at,
    'status', v_invitation.status,
    'verification_code_expires_at', v_invitation.verification_code_expires_at,
    'verification_method', v_invitation.verification_method
  );

  RETURN v_result;
END;
$$;

-- 4. Update complete_pwa_registration_with_code to accept verification_sent status
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
  v_invitation record;
  v_device record;
  v_session record;
  v_session_token text;
  v_result jsonb;
BEGIN
  -- Find invitation with verification_sent status
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_invitation_token
    AND status = 'verification_sent'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite não encontrado ou não está aguardando verificação'
    );
  END IF;

  -- Check code expiration
  IF v_invitation.verification_code_expires_at IS NOT NULL 
     AND v_invitation.verification_code_expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Código de verificação expirado. Solicite um novo código.'
    );
  END IF;

  -- Verify code
  IF v_invitation.verification_code IS NULL 
     OR v_invitation.verification_code != p_verification_code THEN
    -- Increment attempts
    UPDATE user_invitations 
    SET verification_attempts = COALESCE(verification_attempts, 0) + 1
    WHERE id = v_invitation.id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Código de verificação inválido'
    );
  END IF;

  -- Code is valid - complete registration
  
  -- 1. Mark invitation as completed
  UPDATE user_invitations
  SET 
    status = 'completed',
    completed_at = now(),
    device_id = p_device_id
  WHERE id = v_invitation.id;

  -- 2. Create or update pwa_device
  INSERT INTO pwa_devices (
    device_id,
    user_name,
    user_email,
    user_phone,
    user_agent,
    pwa_access,
    is_verified,
    verified_at,
    invitation_id
  ) VALUES (
    p_device_id,
    v_invitation.name,
    v_invitation.email,
    v_invitation.phone,
    p_user_agent,
    v_invitation.pwa_access,
    true,
    now(),
    v_invitation.id
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    user_email = EXCLUDED.user_email,
    user_phone = EXCLUDED.user_phone,
    user_agent = EXCLUDED.user_agent,
    pwa_access = EXCLUDED.pwa_access,
    is_verified = true,
    verified_at = now(),
    invitation_id = EXCLUDED.invitation_id,
    updated_at = now()
  RETURNING * INTO v_device;

  -- 3. Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- 4. Create pwa_session
  INSERT INTO pwa_sessions (
    device_id,
    user_name,
    token,
    pwa_access,
    is_active,
    expires_at
  ) VALUES (
    p_device_id,
    v_invitation.name,
    v_session_token,
    v_invitation.pwa_access,
    true,
    now() + interval '30 days'
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    token = EXCLUDED.token,
    pwa_access = EXCLUDED.pwa_access,
    is_active = true,
    expires_at = EXCLUDED.expires_at,
    last_interaction = now()
  RETURNING * INTO v_session;

  -- 5. Update user_registrations if exists
  UPDATE user_registrations
  SET 
    pwa_registered_at = now(),
    has_app_access = true,
    pwa_access = v_invitation.pwa_access
  WHERE email = v_invitation.email;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cadastro realizado com sucesso!',
    'session_token', v_session_token,
    'pwa_access', v_invitation.pwa_access,
    'user_name', v_invitation.name
  );
END;
$$;