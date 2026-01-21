-- =============================================
-- FIX: login_pwa_by_phone - Handle user_registrations.first_name/last_name
-- Version: 1.0.0
-- Issue: Function was trying to access v_registration.name but user_registrations
--        has first_name and last_name columns instead
-- =============================================

CREATE OR REPLACE FUNCTION public.login_pwa_by_phone(
  p_phone text, 
  p_fingerprint text, 
  p_device_info jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- Clean phone number
  v_phone_clean := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  IF length(v_phone_clean) = 10 OR length(v_phone_clean) = 11 THEN
    v_phone_clean := '55' || v_phone_clean;
  END IF;

  -- Check if device already exists
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE device_id = p_fingerprint
  LIMIT 1;

  IF v_device IS NOT NULL THEN
    IF v_device.is_blocked THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'device_blocked',
        'message', 'Este dispositivo esta bloqueado.'
      );
    END IF;

    IF v_device.is_verified = true AND (v_device.expires_at IS NULL OR v_device.expires_at > NOW()) THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_verified', true,
        'message', 'Dispositivo ja verificado.'
      );
    END IF;

    v_user_name := v_device.user_name;
    v_invitation_id := v_device.invitation_id;
    v_registration_id := v_device.registration_id;
  ELSE
    -- Find user in user_invitations
    SELECT * INTO v_invitation
    FROM user_invitations
    WHERE (phone = p_phone OR phone = v_phone_clean OR phone = '+' || v_phone_clean)
      AND has_app_access = true
      AND status IN ('pending', 'form_submitted', 'verification_sent')
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- Find user in user_registrations
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
        'message', 'Voce precisa de um convite para acessar o PWA. Solicite ao administrador.'
      );
    END IF;

    -- Get user name from the correct source
    IF v_invitation IS NOT NULL THEN
      -- user_invitations has 'name' column
      v_user_name := v_invitation.name;
      v_invitation_id := v_invitation.id;
    ELSE
      -- FIX: user_registrations has first_name + last_name, NOT 'name'
      v_user_name := TRIM(COALESCE(v_registration.first_name, '') || ' ' || COALESCE(v_registration.last_name, ''));
      v_registration_id := v_registration.id;
    END IF;
  END IF;

  -- Generate 6-digit verification code
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Insert or update device
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

  -- Update invitation status if from invitation
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
    'message', 'Codigo de verificacao gerado. Valido por 10 minutos.'
  );
END;
$function$;

-- Grant permissions to all required roles
GRANT EXECUTE ON FUNCTION login_pwa_by_phone TO authenticated;
GRANT EXECUTE ON FUNCTION login_pwa_by_phone TO anon;
GRANT EXECUTE ON FUNCTION login_pwa_by_phone TO service_role;