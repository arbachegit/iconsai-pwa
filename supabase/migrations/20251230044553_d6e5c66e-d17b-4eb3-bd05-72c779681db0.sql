-- 1. Fix PWA registration function - remove device_id column reference
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
  
  -- 1. Mark invitation as completed (REMOVED device_id reference)
  UPDATE user_invitations
  SET 
    status = 'completed',
    completed_at = now()
  WHERE id = v_invitation.id;

  -- 2. Create or update pwa_device
  INSERT INTO pwa_devices (device_id, user_agent, is_verified, verified_at)
  VALUES (p_device_id, p_user_agent, true, now())
  ON CONFLICT (device_id) DO UPDATE SET
    user_agent = EXCLUDED.user_agent,
    is_verified = true,
    verified_at = now(),
    updated_at = now()
  RETURNING * INTO v_device;

  -- 3. Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- 4. Create pwa_session
  INSERT INTO pwa_sessions (
    device_id,
    user_name,
    token,
    is_active,
    has_app_access,
    pwa_access,
    expires_at
  )
  VALUES (
    p_device_id,
    v_invitation.name,
    v_session_token,
    true,
    true,
    v_invitation.pwa_access,
    now() + interval '30 days'
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    token = EXCLUDED.token,
    is_active = true,
    has_app_access = true,
    pwa_access = EXCLUDED.pwa_access,
    expires_at = EXCLUDED.expires_at,
    last_interaction = now()
  RETURNING * INTO v_session;

  -- 5. Clear verification code
  UPDATE user_invitations
  SET 
    verification_code = NULL,
    verification_code_expires_at = NULL,
    verification_attempts = 0
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
    'user_name', v_invitation.name,
    'pwa_access', v_invitation.pwa_access
  );
END;
$$;

-- 2. Add sidebar_favorites column to user_preferences for favorite persistence
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS sidebar_favorites jsonb DEFAULT '["dashboard"]'::jsonb;