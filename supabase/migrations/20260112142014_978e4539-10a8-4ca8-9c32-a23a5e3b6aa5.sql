-- =============================================
-- PWA Auth v4.0 - SIMPLIFICAÇÃO RADICAL
-- Telefone como identificador principal
-- Sem fingerprint instável
-- Build: 2026-01-12T15:00:00Z
-- =============================================

-- 1. Garantir constraint UNIQUE em phone (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pwa_user_devices_phone_unique'
  ) THEN
    -- Primeiro remover duplicatas mantendo apenas o mais recente
    DELETE FROM public.pwa_user_devices a
    USING public.pwa_user_devices b
    WHERE a.phone = b.phone 
      AND a.phone IS NOT NULL
      AND a.created_at < b.created_at;
    
    ALTER TABLE public.pwa_user_devices 
    ADD CONSTRAINT pwa_user_devices_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- 2. Função: check_pwa_access_by_phone
-- Verifica se telefone tem acesso ativo (sem fingerprint)
CREATE OR REPLACE FUNCTION public.check_pwa_access_by_phone(
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_invitation RECORD;
BEGIN
  -- Log da chamada
  RAISE NOTICE '[check_pwa_access_by_phone v4.0] Phone: %', p_phone;

  -- Buscar dispositivo por telefone
  SELECT * INTO v_device
  FROM public.pwa_user_devices
  WHERE phone = p_phone
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Se não encontrou dispositivo
  IF v_device IS NULL THEN
    RAISE NOTICE '[check_pwa_access_by_phone v4.0] Device not found for phone';
    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', true,
      'reason', 'phone_not_found',
      'message', 'Telefone não registrado'
    );
  END IF;

  -- Verificar se está bloqueado
  IF v_device.is_blocked = true THEN
    RAISE NOTICE '[check_pwa_access_by_phone v4.0] Device is blocked';
    RETURN jsonb_build_object(
      'has_access', false,
      'is_blocked', true,
      'block_reason', v_device.block_reason,
      'reason', 'blocked'
    );
  END IF;

  -- Verificar se está verificado e não expirado
  IF v_device.is_verified = true AND v_device.expires_at > NOW() THEN
    RAISE NOTICE '[check_pwa_access_by_phone v4.0] Access GRANTED';
    
    -- Buscar dados do convite
    SELECT ui.name, ui.pwa_access 
    INTO v_invitation
    FROM public.user_invitations ui
    WHERE ui.phone = p_phone
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'has_access', true,
      'user_name', COALESCE(v_invitation.name, v_device.user_name),
      'user_phone', p_phone,
      'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY['knowyou']),
      'expires_at', v_device.expires_at,
      'reason', 'verified'
    );
  END IF;

  -- Verificar se expirou
  IF v_device.expires_at IS NOT NULL AND v_device.expires_at <= NOW() THEN
    RAISE NOTICE '[check_pwa_access_by_phone v4.0] Access EXPIRED';
    RETURN jsonb_build_object(
      'has_access', false,
      'needs_login', true,
      'reason', 'expired',
      'message', 'Acesso expirado. Faça login novamente.',
      'user_phone', p_phone
    );
  END IF;

  -- Precisa verificar (tem registro mas não está verificado)
  IF v_device.is_verified IS NOT TRUE THEN
    RAISE NOTICE '[check_pwa_access_by_phone v4.0] Needs verification';
    RETURN jsonb_build_object(
      'has_access', false,
      'needs_verification', true,
      'reason', 'not_verified',
      'user_phone', p_phone
    );
  END IF;

  -- Fallback: precisa login
  RETURN jsonb_build_object(
    'has_access', false,
    'needs_login', true,
    'reason', 'unknown'
  );
END;
$$;

-- 3. Função: login_pwa_by_phone_simple
-- Login simplificado por telefone (sem fingerprint)
CREATE OR REPLACE FUNCTION public.login_pwa_by_phone_simple(
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_device RECORD;
  v_code TEXT;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Log da chamada
  RAISE NOTICE '[login_pwa_by_phone_simple v4.0] Phone: %', p_phone;

  -- Validar telefone
  IF p_phone IS NULL OR length(trim(p_phone)) < 8 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_phone',
      'message', 'Telefone inválido'
    );
  END IF;

  -- Buscar convite ativo
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE phone = p_phone
    AND has_app_access = true
    AND expires_at > v_now
    AND status IN ('pending', 'form_submitted', 'accepted')
  LIMIT 1;

  IF v_invitation IS NULL THEN
    RAISE NOTICE '[login_pwa_by_phone_simple v4.0] No invitation found';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_invitation',
      'message', 'Não encontramos um convite ativo para este telefone.'
    );
  END IF;

  -- Verificar se já existe dispositivo verificado para este telefone
  SELECT * INTO v_device
  FROM public.pwa_user_devices
  WHERE phone = p_phone
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_device IS NOT NULL AND v_device.is_verified = true AND v_device.expires_at > v_now THEN
    RAISE NOTICE '[login_pwa_by_phone_simple v4.0] Already verified';
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'user_name', v_invitation.name,
      'expires_at', v_device.expires_at
    );
  END IF;

  -- Gerar código de verificação (6 dígitos)
  v_code := lpad(floor(random() * 1000000)::TEXT, 6, '0');

  -- Criar ou atualizar dispositivo (upsert por telefone)
  INSERT INTO public.pwa_user_devices (
    device_id,
    phone,
    user_name,
    verification_code,
    verification_code_expires_at,
    verification_attempts,
    is_verified,
    created_at,
    updated_at
  ) VALUES (
    'phone_' || replace(p_phone, '+', ''),
    p_phone,
    v_invitation.name,
    v_code,
    v_now + INTERVAL '10 minutes',
    0,
    false,
    v_now,
    v_now
  )
  ON CONFLICT (phone) DO UPDATE SET
    verification_code = v_code,
    verification_code_expires_at = v_now + INTERVAL '10 minutes',
    verification_attempts = 0,
    user_name = v_invitation.name,
    updated_at = v_now;

  RAISE NOTICE '[login_pwa_by_phone_simple v4.0] Code generated: %', v_code;

  RETURN jsonb_build_object(
    'success', true,
    'verification_code', v_code,
    'user_name', v_invitation.name,
    'code_expires_at', v_now + INTERVAL '10 minutes'
  );
END;
$$;

-- 4. Função: verify_pwa_code_simple
-- Verifica código por telefone (sem fingerprint)
CREATE OR REPLACE FUNCTION public.verify_pwa_code_simple(
  p_phone TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_invitation RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Log da chamada
  RAISE NOTICE '[verify_pwa_code_simple v4.0] Phone: %, Code: %', p_phone, p_code;

  -- Buscar dispositivo por telefone
  SELECT * INTO v_device
  FROM public.pwa_user_devices
  WHERE phone = p_phone
  LIMIT 1;

  IF v_device IS NULL THEN
    RAISE NOTICE '[verify_pwa_code_simple v4.0] Device not found';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_not_found',
      'message', 'Dispositivo não encontrado. Faça login novamente.'
    );
  END IF;

  -- Verificar se já está verificado
  IF v_device.is_verified = true AND v_device.expires_at > v_now THEN
    RAISE NOTICE '[verify_pwa_code_simple v4.0] Already verified';
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'user_name', v_device.user_name,
      'expires_at', v_device.expires_at
    );
  END IF;

  -- Verificar tentativas
  IF v_device.verification_attempts >= 5 THEN
    -- Bloquear dispositivo
    UPDATE public.pwa_user_devices
    SET is_blocked = true, 
        block_reason = 'Excesso de tentativas de verificação',
        updated_at = v_now
    WHERE phone = p_phone;
    
    RAISE NOTICE '[verify_pwa_code_simple v4.0] Too many attempts - blocked';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'too_many_attempts',
      'message', 'Dispositivo bloqueado por excesso de tentativas.'
    );
  END IF;

  -- Verificar expiração do código
  IF v_device.verification_code_expires_at IS NULL OR v_device.verification_code_expires_at < v_now THEN
    RAISE NOTICE '[verify_pwa_code_simple v4.0] Code expired';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'code_expired',
      'message', 'Código expirado. Solicite um novo código.'
    );
  END IF;

  -- Verificar código (case insensitive, trim)
  IF UPPER(TRIM(v_device.verification_code)) != UPPER(TRIM(p_code)) THEN
    -- Incrementar tentativas
    UPDATE public.pwa_user_devices
    SET verification_attempts = COALESCE(verification_attempts, 0) + 1,
        updated_at = v_now
    WHERE phone = p_phone;
    
    RAISE NOTICE '[verify_pwa_code_simple v4.0] Invalid code. Attempts: %', COALESCE(v_device.verification_attempts, 0) + 1;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido.',
      'attempts_remaining', 5 - COALESCE(v_device.verification_attempts, 0) - 1
    );
  END IF;

  -- Código válido! Marcar como verificado
  v_expires_at := v_now + INTERVAL '90 days';
  
  UPDATE public.pwa_user_devices
  SET is_verified = true,
      verified_at = v_now,
      expires_at = v_expires_at,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_attempts = 0,
      updated_at = v_now
  WHERE phone = p_phone;

  -- Atualizar status do convite
  UPDATE public.user_invitations
  SET status = 'accepted',
      accepted_at = v_now
  WHERE phone = p_phone
    AND status IN ('pending', 'form_submitted');

  -- Buscar dados do convite
  SELECT name, pwa_access INTO v_invitation
  FROM public.user_invitations
  WHERE phone = p_phone
  LIMIT 1;

  RAISE NOTICE '[verify_pwa_code_simple v4.0] Verification SUCCESS!';

  RETURN jsonb_build_object(
    'success', true,
    'user_name', COALESCE(v_invitation.name, v_device.user_name),
    'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY['knowyou']),
    'expires_at', v_expires_at
  );
END;
$$;

-- 5. Grants
GRANT EXECUTE ON FUNCTION public.check_pwa_access_by_phone(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_pwa_by_phone_simple(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pwa_code_simple(TEXT, TEXT) TO anon, authenticated;

-- 6. Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'PWA Auth v4.0 - SIMPLIFICAÇÃO CONCLUÍDA';
  RAISE NOTICE 'Funções criadas:';
  RAISE NOTICE '  - check_pwa_access_by_phone(phone)';
  RAISE NOTICE '  - login_pwa_by_phone_simple(phone)';
  RAISE NOTICE '  - verify_pwa_code_simple(phone, code)';
  RAISE NOTICE '=============================================';
END $$;