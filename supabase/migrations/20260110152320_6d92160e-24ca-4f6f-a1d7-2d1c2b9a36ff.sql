-- ============================================
-- MIGRATION: PWA Auth Flow v2.0
-- Login por telefone com verificação de convite
-- Expiração de 90 dias
-- ============================================

-- 1. Adicionar coluna expires_at se não existir
ALTER TABLE pwa_devices 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. FUNÇÃO: check_pwa_access (ATUALIZADA)
-- Verifica acesso e considera expiração de 90 dias
CREATE OR REPLACE FUNCTION check_pwa_access(
  p_device_id TEXT,
  p_agent_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Buscar dispositivo por fingerprint
  SELECT * INTO v_device
  FROM pwa_devices
  WHERE fingerprint = p_device_id;
  
  -- Dispositivo não encontrado - precisa login
  IF v_device IS NULL THEN
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'reason', 'device_not_found',
      'needs_login', TRUE
    );
  END IF;
  
  -- Dispositivo bloqueado
  IF v_device.is_blocked THEN
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'is_blocked', TRUE,
      'block_reason', v_device.block_reason
    );
  END IF;
  
  -- Não verificado ainda
  IF NOT v_device.is_verified THEN
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'needs_verification', TRUE,
      'user_phone', v_device.phone
    );
  END IF;
  
  -- Verificar expiração (90 dias)
  IF v_device.expires_at IS NOT NULL AND v_device.expires_at < v_now THEN
    -- Marcar como não verificado
    UPDATE pwa_devices
    SET is_verified = FALSE, updated_at = v_now
    WHERE id = v_device.id;
    
    RETURN jsonb_build_object(
      'has_access', FALSE,
      'reason', 'expired',
      'needs_login', TRUE,
      'user_phone', v_device.phone
    );
  END IF;
  
  -- Atualizar último acesso
  UPDATE pwa_devices
  SET last_access_at = v_now, updated_at = v_now
  WHERE id = v_device.id;
  
  -- Acesso válido!
  RETURN jsonb_build_object(
    'has_access', TRUE,
    'user_id', v_device.id,
    'user_name', v_device.user_name,
    'pwa_access', v_device.pwa_access
  );
END;
$$;

-- 3. FUNÇÃO: login_pwa_by_phone (NOVA)
-- Login apenas por telefone, verifica se tem convite
CREATE OR REPLACE FUNCTION login_pwa_by_phone(
  p_phone TEXT,
  p_fingerprint TEXT,
  p_device_info JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_registration RECORD;
  v_existing_device RECORD;
  v_phone_clean TEXT;
  v_code TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_user_name TEXT;
  v_user_email TEXT;
  v_pwa_access TEXT[];
BEGIN
  -- Limpar telefone para formato internacional
  v_phone_clean := regexp_replace(p_phone, '[^0-9+]', '', 'g');
  IF NOT v_phone_clean LIKE '+%' THEN
    IF LENGTH(v_phone_clean) IN (10, 11) THEN
      v_phone_clean := '+55' || v_phone_clean;
    END IF;
  END IF;
  
  -- Verificar se já existe dispositivo verificado e válido
  SELECT * INTO v_existing_device
  FROM pwa_devices
  WHERE fingerprint = p_fingerprint 
    AND is_verified = TRUE
    AND (expires_at IS NULL OR expires_at > v_now);
  
  IF v_existing_device IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'already_verified', TRUE,
      'user_name', v_existing_device.user_name
    );
  END IF;
  
  -- Buscar convite ativo
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE phone = v_phone_clean
    AND status IN ('pending', 'form_submitted')
    AND expires_at > v_now
    AND has_app_access = TRUE
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Se não tem convite, buscar registro aprovado
  IF v_invitation IS NULL THEN
    SELECT * INTO v_registration
    FROM user_registrations
    WHERE phone = v_phone_clean
      AND status = 'approved'
      AND has_app_access = TRUE
    LIMIT 1;
  END IF;
  
  -- Se não tem convite nem registro, buscar dispositivo existente com mesmo telefone
  IF v_invitation IS NULL AND v_registration IS NULL THEN
    SELECT * INTO v_existing_device
    FROM pwa_devices
    WHERE phone = v_phone_clean 
      AND is_verified = TRUE
    LIMIT 1;
    
    -- Se ainda não encontrou nada, retornar erro
    IF v_existing_device IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'no_invitation',
        'message', 'Não encontramos um convite para este telefone. Você precisa de um convite para acessar o KnowYOU.'
      );
    END IF;
    
    -- Usar dados do dispositivo existente
    v_user_name := v_existing_device.user_name;
    v_user_email := v_existing_device.email;
    v_pwa_access := v_existing_device.pwa_access;
  ELSE
    -- Usar dados do convite ou registro
    v_user_name := COALESCE(v_invitation.name, v_registration.name);
    v_user_email := COALESCE(v_invitation.email, v_registration.email);
    v_pwa_access := COALESCE(v_invitation.pwa_access, v_registration.pwa_access, ARRAY['economia', 'health', 'ideias']);
  END IF;
  
  -- Gerar código de verificação (6 dígitos)
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Criar ou atualizar dispositivo
  INSERT INTO pwa_devices (
    fingerprint, 
    phone, 
    email, 
    user_name,
    invitation_id, 
    registration_id,
    verification_code, 
    verification_code_expires_at,
    verification_attempts, 
    is_verified, 
    pwa_access,
    os_name, 
    os_version, 
    browser_name, 
    browser_version,
    device_vendor, 
    device_model, 
    screen_width, 
    screen_height,
    pixel_ratio, 
    has_touch, 
    has_microphone, 
    user_agent,
    created_at,
    updated_at
  )
  VALUES (
    p_fingerprint, 
    v_phone_clean,
    v_user_email,
    v_user_name,
    v_invitation.id, 
    v_registration.id,
    v_code, 
    v_now + INTERVAL '10 minutes',
    0, 
    FALSE,
    v_pwa_access,
    (p_device_info->>'os_name'),
    (p_device_info->>'os_version'),
    (p_device_info->>'browser_name'),
    (p_device_info->>'browser_version'),
    (p_device_info->>'device_vendor'),
    (p_device_info->>'device_model'),
    (p_device_info->>'screen_width')::INTEGER,
    (p_device_info->>'screen_height')::INTEGER,
    (p_device_info->>'pixel_ratio')::NUMERIC,
    (p_device_info->>'has_touch')::BOOLEAN,
    (p_device_info->>'has_microphone')::BOOLEAN,
    (p_device_info->>'user_agent'),
    v_now,
    v_now
  )
  ON CONFLICT (fingerprint) DO UPDATE SET
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    user_name = EXCLUDED.user_name,
    invitation_id = EXCLUDED.invitation_id,
    registration_id = EXCLUDED.registration_id,
    verification_code = EXCLUDED.verification_code,
    verification_code_expires_at = EXCLUDED.verification_code_expires_at,
    verification_attempts = 0,
    is_verified = FALSE,
    pwa_access = EXCLUDED.pwa_access,
    updated_at = v_now;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'verification_code', v_code,
    'user_name', v_user_name
  );
END;
$$;

-- 4. FUNÇÃO: verify_pwa_device_code (ATUALIZADA)
-- Ativa dispositivo por 90 dias
CREATE OR REPLACE FUNCTION verify_pwa_device_code(
  p_fingerprint TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Buscar dispositivo
  SELECT * INTO v_device
  FROM pwa_devices
  WHERE fingerprint = p_fingerprint;
  
  IF v_device IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'device_not_found');
  END IF;
  
  IF v_device.is_blocked THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'blocked');
  END IF;
  
  -- Verificar tentativas excessivas
  IF v_device.verification_attempts >= 5 THEN
    UPDATE pwa_devices
    SET is_blocked = TRUE, 
        block_reason = 'Excesso de tentativas de verificação', 
        updated_at = v_now
    WHERE id = v_device.id;
    
    RETURN jsonb_build_object('success', FALSE, 'error', 'too_many_attempts');
  END IF;
  
  -- Verificar expiração do código
  IF v_device.verification_code_expires_at < v_now THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'code_expired');
  END IF;
  
  -- Verificar código
  IF v_device.verification_code != p_code THEN
    UPDATE pwa_devices
    SET verification_attempts = verification_attempts + 1, 
        updated_at = v_now
    WHERE id = v_device.id;
    
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'invalid_code',
      'attempts_remaining', 5 - v_device.verification_attempts - 1
    );
  END IF;
  
  -- Código correto! Ativar por 90 dias
  v_expires_at := v_now + INTERVAL '90 days';
  
  UPDATE pwa_devices
  SET is_verified = TRUE,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_attempts = 0,
      expires_at = v_expires_at,
      last_access_at = v_now,
      updated_at = v_now
  WHERE id = v_device.id;
  
  -- Atualizar convite se existir
  IF v_device.invitation_id IS NOT NULL THEN
    UPDATE user_invitations
    SET status = 'completed', 
        pwa_registered_at = v_now, 
        updated_at = v_now
    WHERE id = v_device.invitation_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'user_name', v_device.user_name,
    'pwa_access', v_device.pwa_access,
    'expires_at', v_expires_at
  );
END;
$$;

-- GRANTS
GRANT EXECUTE ON FUNCTION check_pwa_access(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_pwa_by_phone(TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_pwa_device_code(TEXT, TEXT) TO anon, authenticated;