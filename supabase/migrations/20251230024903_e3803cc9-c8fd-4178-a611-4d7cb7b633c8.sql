-- EMERGENCY FIX: Corrigir função register_pwa_user
-- Problema: Referência incorreta a tabela "pwa_invitations" que não existe
-- Solução: Usar "user_invitations" e corrigir toda a lógica

-- 1. Adicionar constraint UNIQUE em pwa_sessions.device_id (para ON CONFLICT funcionar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pwa_sessions_device_id_unique'
  ) THEN
    ALTER TABLE pwa_sessions 
    ADD CONSTRAINT pwa_sessions_device_id_unique 
    UNIQUE (device_id);
  END IF;
END $$;

-- 2. Recriar função register_pwa_user com referências corretas
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
  v_existing_device RECORD;
  v_session_token TEXT;
  v_pwa_access TEXT[];
  v_registration_id UUID;
  v_device_uuid UUID;
BEGIN
  -- 1. Validate invitation (TABELA CORRETA: user_invitations)
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_invitation_token
    AND status IN ('pending', 'form_submitted')
    AND expires_at > NOW()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite inválido ou expirado'
    );
  END IF;
  
  -- 2. Get pwa_access from invitation
  v_pwa_access := COALESCE(v_invitation.pwa_access, ARRAY[]::TEXT[]);
  
  -- 3. Find user_registration by email (se existir)
  SELECT id INTO v_registration_id
  FROM user_registrations
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
  
  -- 4. Check for existing device
  SELECT * INTO v_existing_device
  FROM pwa_devices
  WHERE device_fingerprint = p_device_id;
  
  IF FOUND THEN
    -- Update existing device
    UPDATE pwa_devices
    SET 
      user_name = p_name,
      user_email = p_email,
      phone_number = p_phone,
      is_verified = true,
      is_trusted = true,
      user_registration_id = v_registration_id,
      pwa_slugs = v_pwa_access,
      updated_at = NOW()
    WHERE id = v_existing_device.id
    RETURNING id INTO v_device_uuid;
  ELSE
    -- Create new device
    INSERT INTO pwa_devices (
      device_fingerprint,
      user_name,
      user_email,
      phone_number,
      user_agent,
      pwa_slugs,
      is_verified,
      is_trusted,
      user_registration_id
    ) VALUES (
      p_device_id,
      p_name,
      p_email,
      p_phone,
      p_user_agent,
      v_pwa_access,
      true,
      true,
      v_registration_id
    )
    RETURNING id INTO v_device_uuid;
  END IF;
  
  -- 5. Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  
  -- 6. Create/update session in pwa_sessions
  INSERT INTO pwa_sessions (
    device_id,
    user_name,
    token,
    pwa_access,
    is_active,
    has_app_access
  ) VALUES (
    p_device_id,
    p_name,
    v_session_token,
    v_pwa_access,
    true,
    true
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    token = EXCLUDED.token,
    pwa_access = EXCLUDED.pwa_access,
    is_active = true,
    has_app_access = true,
    last_interaction = NOW();
  
  -- 7. Mark invitation as completed
  UPDATE user_invitations
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_invitation.id;
  
  -- 8. Update user_registrations if linked
  IF v_registration_id IS NOT NULL THEN
    UPDATE user_registrations
    SET 
      pwa_registered_at = NOW(),
      has_app_access = true,
      pwa_access = v_pwa_access
    WHERE id = v_registration_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cadastro realizado com sucesso',
    'session_token', v_session_token,
    'pwa_access', v_pwa_access
  );
END;
$$;