-- =============================================
-- NUCLEAR FIX: PWA Authentication v3.0
-- Build: 2026-01-12 - OBRIGATÓRIO
-- =============================================

-- 1. GARANTIR CONSTRAINT ÚNICO (já existe, mas garantir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pwa_user_devices_device_id_key'
  ) THEN
    ALTER TABLE pwa_user_devices 
    ADD CONSTRAINT pwa_user_devices_device_id_key UNIQUE (device_id);
  END IF;
END $$;

-- 2. FUNÇÃO check_pwa_access CORRIGIDA v3.0
CREATE OR REPLACE FUNCTION check_pwa_access(
  p_device_id TEXT,
  p_agent_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
BEGIN
  -- Log para debug
  RAISE NOTICE '[check_pwa_access v3.0] device_id: %', p_device_id;

  -- Buscar dispositivo
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE device_id = p_device_id
  LIMIT 1;

  -- Se dispositivo não existe
  IF v_device IS NULL THEN
    RAISE NOTICE '[check_pwa_access v3.0] Device NAO encontrado';
    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', true,
      'needs_verification', false,
      'is_blocked', false,
      'reason', 'device_not_found'
    );
  END IF;

  -- Se dispositivo bloqueado
  IF v_device.is_blocked = true THEN
    RAISE NOTICE '[check_pwa_access v3.0] Device BLOQUEADO';
    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', false,
      'needs_verification', false,
      'is_blocked', true,
      'reason', 'device_blocked',
      'block_reason', v_device.blocked_reason
    );
  END IF;

  -- Se não verificado (USAR IS NOT TRUE para tratar NULL)
  IF v_device.is_verified IS NOT TRUE THEN
    RAISE NOTICE '[check_pwa_access v3.0] Device NAO verificado. is_verified=%', v_device.is_verified;
    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', false,
      'needs_verification', true,
      'is_blocked', false,
      'reason', 'not_verified',
      'user_phone', v_device.phone
    );
  END IF;

  -- Se expirado
  IF v_device.expires_at IS NOT NULL AND v_device.expires_at < NOW() THEN
    RAISE NOTICE '[check_pwa_access v3.0] Acesso EXPIRADO';
    UPDATE pwa_user_devices
    SET is_verified = false,
        updated_at = NOW()
    WHERE id = v_device.id;

    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', true,
      'needs_verification', false,
      'is_blocked', false,
      'reason', 'access_expired',
      'user_phone', v_device.phone
    );
  END IF;

  -- SUCESSO - Tem acesso
  RAISE NOTICE '[check_pwa_access v3.0] ACESSO CONCEDIDO para %', v_device.user_name;
  
  UPDATE pwa_user_devices
  SET last_access_at = NOW(),
      updated_at = NOW()
  WHERE id = v_device.id;

  RETURN jsonb_build_object(
    'has_access', true,
    'needs_login', false,
    'needs_verification', false,
    'is_blocked', false,
    'reason', null,
    'device_id', v_device.device_id,
    'user_name', v_device.user_name,
    'user_phone', v_device.phone,
    'expires_at', v_device.expires_at
  );
END;
$$;

-- 3. FUNÇÃO verify_pwa_device_code CORRIGIDA v3.0
CREATE OR REPLACE FUNCTION verify_pwa_device_code(
  p_fingerprint TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_expires_at TIMESTAMPTZ;
BEGIN
  RAISE NOTICE '[verify_pwa_device_code v3.0] fingerprint: %, code: %', p_fingerprint, p_code;

  -- Buscar dispositivo por device_id (fingerprint)
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE device_id = p_fingerprint
  LIMIT 1;

  IF v_device IS NULL THEN
    RAISE NOTICE '[verify_pwa_device_code v3.0] Device NAO encontrado';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_not_found',
      'message', 'Dispositivo nao encontrado. Inicie o processo novamente.'
    );
  END IF;

  IF v_device.is_blocked = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_blocked',
      'message', 'Este dispositivo esta bloqueado.'
    );
  END IF;

  IF v_device.verification_code_expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'code_expired',
      'message', 'Codigo expirado. Solicite um novo codigo.'
    );
  END IF;

  IF COALESCE(v_device.verification_attempts, 0) >= 5 THEN
    UPDATE pwa_user_devices
    SET is_blocked = true,
        blocked_reason = 'Excedeu tentativas de verificacao',
        updated_at = NOW()
    WHERE id = v_device.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'max_attempts',
      'message', 'Maximo de tentativas excedido. Dispositivo bloqueado.'
    );
  END IF;

  -- Verificar código (case insensitive, trim)
  IF UPPER(TRIM(COALESCE(v_device.verification_code, ''))) != UPPER(TRIM(p_code)) THEN
    UPDATE pwa_user_devices
    SET verification_attempts = COALESCE(verification_attempts, 0) + 1,
        updated_at = NOW()
    WHERE id = v_device.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Codigo invalido. Tente novamente.',
      'attempts_remaining', 5 - (COALESCE(v_device.verification_attempts, 0) + 1)
    );
  END IF;

  -- CÓDIGO CORRETO - VERIFICAR DISPOSITIVO
  v_expires_at := NOW() + INTERVAL '90 days';

  RAISE NOTICE '[verify_pwa_device_code v3.0] Codigo correto! Verificando dispositivo...';

  UPDATE pwa_user_devices
  SET is_verified = true,
      verified_at = NOW(),
      expires_at = v_expires_at,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_attempts = 0,
      last_access_at = NOW(),
      updated_at = NOW()
  WHERE id = v_device.id;

  -- Atualizar status do convite para 'accepted'
  IF v_device.invitation_id IS NOT NULL THEN
    UPDATE user_invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = v_device.invitation_id
      AND status NOT IN ('accepted', 'completed');
    
    RAISE NOTICE '[verify_pwa_device_code v3.0] Convite % marcado como accepted', v_device.invitation_id;
  END IF;

  RAISE NOTICE '[verify_pwa_device_code v3.0] SUCESSO! Device verificado ate %', v_expires_at;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Dispositivo verificado com sucesso!',
    'user_name', v_device.user_name,
    'user_phone', v_device.phone,
    'expires_at', v_expires_at,
    'device_id', v_device.device_id
  );
END;
$$;

-- 4. ADICIONAR COLUNA accepted_at SE NÃO EXISTIR
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- 5. GRANTS
GRANT EXECUTE ON FUNCTION check_pwa_access(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION verify_pwa_device_code(TEXT, TEXT) TO anon, authenticated, service_role;

-- 6. CORRIGIR REGISTROS ÓRFÃOS (dispositivos verificados mas convites não atualizados)
UPDATE user_invitations ui
SET status = 'accepted',
    accepted_at = pud.verified_at
FROM pwa_user_devices pud
WHERE ui.id = pud.invitation_id
  AND pud.is_verified = true
  AND ui.status NOT IN ('accepted', 'completed');