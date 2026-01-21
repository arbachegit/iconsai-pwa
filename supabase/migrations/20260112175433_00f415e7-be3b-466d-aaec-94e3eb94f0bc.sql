-- =============================================
-- FIX: login_pwa_by_phone_simple - Busca flexível por dígitos
-- Problema: Convites salvos como "(11) 97289-0180" não eram encontrados
-- quando buscados como "+5511972890180"
-- =============================================

CREATE OR REPLACE FUNCTION public.login_pwa_by_phone_simple(p_phone TEXT)
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
  v_normalized_phone TEXT;
  v_phone_digits TEXT;
BEGIN
  -- Extrair apenas dígitos do telefone
  v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Guardar últimos 10-11 dígitos para busca flexível
  v_phone_digits := right(v_phone_digits, 11);
  
  -- Normalizar para formato completo +55...
  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_normalized_phone) = 10 OR length(v_normalized_phone) = 11 THEN
    v_normalized_phone := '55' || v_normalized_phone;
  END IF;
  IF NOT v_normalized_phone LIKE '+%' THEN
    v_normalized_phone := '+' || v_normalized_phone;
  END IF;

  -- Validar telefone
  IF v_normalized_phone IS NULL OR length(v_normalized_phone) < 12 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_phone',
      'message', 'Telefone inválido. Use o formato (DDD) 9XXXX-XXXX'
    );
  END IF;

  -- Buscar convite ativo - COMPARAR PELOS ÚLTIMOS 10-11 DÍGITOS
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE (
    right(regexp_replace(phone, '[^0-9]', '', 'g'), 11) = v_phone_digits
    OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = right(v_phone_digits, 10)
  )
  AND has_app_access = true
  AND expires_at > v_now
  AND status IN ('pending', 'form_submitted', 'accepted', 'completed')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_invitation',
      'message', 'Não encontramos um convite ativo para este telefone.',
      'debug_phone_digits', v_phone_digits,
      'debug_normalized', v_normalized_phone
    );
  END IF;

  -- Verificar se já existe dispositivo verificado
  SELECT * INTO v_device
  FROM public.pwa_user_devices
  WHERE (
    phone = v_normalized_phone
    OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 11) = v_phone_digits
  )
  AND is_verified = true
  AND expires_at > v_now;

  IF v_device IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'user_name', v_device.user_name,
      'pwa_access', v_invitation.pwa_access,
      'expires_at', v_device.expires_at
    );
  END IF;

  -- Gerar código de 6 dígitos
  v_code := lpad(floor(random() * 1000000)::TEXT, 6, '0');

  -- Criar ou atualizar dispositivo (upsert por telefone normalizado)
  INSERT INTO public.pwa_user_devices (
    device_id, phone, user_name, verification_code,
    verification_code_expires_at, verification_attempts,
    is_verified, created_at, updated_at
  ) VALUES (
    'phone_' || replace(v_normalized_phone, '+', ''),
    v_normalized_phone,
    v_invitation.name,
    v_code,
    v_now + INTERVAL '10 minutes',
    0, false, v_now, v_now
  )
  ON CONFLICT (phone) DO UPDATE SET
    verification_code = v_code,
    verification_code_expires_at = v_now + INTERVAL '10 minutes',
    verification_attempts = 0,
    user_name = v_invitation.name,
    updated_at = v_now;

  RETURN jsonb_build_object(
    'success', true,
    'verification_code', v_code,
    'user_name', v_invitation.name,
    'normalized_phone', v_normalized_phone,
    'code_expires_at', v_now + INTERVAL '10 minutes'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'Erro interno. Tente novamente.',
    'details', SQLERRM
  );
END;
$$;

-- =============================================
-- FIX: verify_pwa_code_simple - Busca flexível por dígitos
-- =============================================

CREATE OR REPLACE FUNCTION public.verify_pwa_code_simple(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_invitation RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_normalized_phone TEXT;
  v_phone_digits TEXT;
BEGIN
  -- Extrair apenas dígitos do telefone
  v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  v_phone_digits := right(v_phone_digits, 11);
  
  -- Normalizar telefone
  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_normalized_phone) = 10 OR length(v_normalized_phone) = 11 THEN
    v_normalized_phone := '55' || v_normalized_phone;
  END IF;
  IF NOT v_normalized_phone LIKE '+%' THEN
    v_normalized_phone := '+' || v_normalized_phone;
  END IF;

  -- Buscar dispositivo com busca flexível
  SELECT * INTO v_device
  FROM public.pwa_user_devices
  WHERE (
    phone = v_normalized_phone
    OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 11) = v_phone_digits
  )
  AND verification_code = p_code
  AND verification_code_expires_at > v_now
  LIMIT 1;

  IF v_device IS NULL THEN
    -- Verificar se existe dispositivo mas código expirou
    SELECT * INTO v_device
    FROM public.pwa_user_devices
    WHERE (
      phone = v_normalized_phone
      OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 11) = v_phone_digits
    )
    LIMIT 1;
    
    IF v_device IS NOT NULL THEN
      -- Incrementar tentativas
      UPDATE public.pwa_user_devices
      SET verification_attempts = COALESCE(verification_attempts, 0) + 1,
          updated_at = v_now
      WHERE id = v_device.id;
      
      IF v_device.verification_code_expires_at < v_now THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'code_expired',
          'message', 'Código expirado. Solicite um novo código.'
        );
      END IF;
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido. Verifique e tente novamente.'
    );
  END IF;

  -- Buscar convite para pegar pwa_access
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE (
    right(regexp_replace(phone, '[^0-9]', '', 'g'), 11) = v_phone_digits
    OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = right(v_phone_digits, 10)
  )
  AND has_app_access = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Marcar dispositivo como verificado
  UPDATE public.pwa_user_devices
  SET is_verified = true,
      verified_at = v_now,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_attempts = 0,
      expires_at = v_now + INTERVAL '30 days',
      updated_at = v_now
  WHERE id = v_device.id;

  RETURN jsonb_build_object(
    'success', true,
    'verified', true,
    'user_name', v_device.user_name,
    'phone', v_device.phone,
    'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY['area1']::TEXT[]),
    'expires_at', v_now + INTERVAL '30 days'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'Erro interno. Tente novamente.',
    'details', SQLERRM
  );
END;
$$;