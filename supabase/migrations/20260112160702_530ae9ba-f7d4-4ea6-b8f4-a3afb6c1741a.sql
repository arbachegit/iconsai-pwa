-- =============================================
-- FIX: login_pwa_by_phone_simple - Normalização de telefone
-- Build: 2026-01-12
-- =============================================

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
  v_normalized_phone TEXT;
BEGIN
  -- Normalizar telefone: remover não-dígitos, prefixar +55 se necessário
  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Se tem 10 ou 11 dígitos, prefixar 55
  IF length(v_normalized_phone) = 10 OR length(v_normalized_phone) = 11 THEN
    v_normalized_phone := '55' || v_normalized_phone;
  END IF;
  
  -- Adicionar + se não tiver
  IF NOT v_normalized_phone LIKE '+%' THEN
    v_normalized_phone := '+' || v_normalized_phone;
  END IF;

  RAISE NOTICE '[login_pwa_by_phone_simple v4.1] Input: % -> Normalized: %', p_phone, v_normalized_phone;

  -- Validar telefone
  IF v_normalized_phone IS NULL OR length(v_normalized_phone) < 12 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_phone',
      'message', 'Telefone inválido. Use o formato (DDD) 9XXXX-XXXX'
    );
  END IF;

  -- Buscar convite ativo - tentar match exato primeiro
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE phone = v_normalized_phone
    AND has_app_access = true
    AND expires_at > v_now
    AND status IN ('pending', 'form_submitted', 'accepted', 'completed')
  LIMIT 1;
  
  -- Se não encontrou, tentar com variações de formato
  IF v_invitation IS NULL THEN
    SELECT * INTO v_invitation
    FROM public.user_invitations
    WHERE (
      phone = v_normalized_phone
      OR phone = ltrim(v_normalized_phone, '+')
      OR phone = regexp_replace(phone, '[^0-9]', '', 'g') 
         AND regexp_replace(phone, '[^0-9]', '', 'g') = ltrim(v_normalized_phone, '+')
    )
    AND has_app_access = true
    AND expires_at > v_now
    AND status IN ('pending', 'form_submitted', 'accepted', 'completed')
    LIMIT 1;
  END IF;

  IF v_invitation IS NULL THEN
    RAISE NOTICE '[login_pwa_by_phone_simple v4.1] No invitation found for: %', v_normalized_phone;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_invitation',
      'message', 'Não encontramos um convite ativo para este telefone. Verifique se digitou corretamente.'
    );
  END IF;

  RAISE NOTICE '[login_pwa_by_phone_simple v4.1] Found invitation: % for %', v_invitation.id, v_invitation.name;

  -- Verificar se já existe dispositivo verificado para este telefone
  SELECT * INTO v_device
  FROM public.pwa_user_devices
  WHERE phone = v_normalized_phone
    AND is_verified = true
    AND expires_at > v_now;

  IF v_device IS NOT NULL THEN
    RAISE NOTICE '[login_pwa_by_phone_simple v4.1] Already verified device found';
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
    'phone_' || replace(v_normalized_phone, '+', ''),
    v_normalized_phone,
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

  RAISE NOTICE '[login_pwa_by_phone_simple v4.1] Code generated: % for %', v_code, v_invitation.name;

  RETURN jsonb_build_object(
    'success', true,
    'verification_code', v_code,
    'user_name', v_invitation.name,
    'normalized_phone', v_normalized_phone,
    'code_expires_at', v_now + INTERVAL '10 minutes'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[login_pwa_by_phone_simple v4.1] Error: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'Erro interno. Tente novamente.'
  );
END;
$$;