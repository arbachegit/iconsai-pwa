-- Corrigir função verify_pwa_code_simple
-- PROBLEMA: Estava buscando código em user_invitations, mas o código é salvo em pwa_user_devices
-- SOLUÇÃO: Buscar código em pwa_user_devices

CREATE OR REPLACE FUNCTION verify_pwa_code_simple(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_invitation RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Normalizar telefone
  p_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Buscar dispositivo com código válido (TABELA CORRETA: pwa_user_devices)
  SELECT *
  INTO v_device
  FROM public.pwa_user_devices
  WHERE phone = p_phone
    AND verification_code = p_code
    AND verification_code_expires_at > v_now
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido ou expirado'
    );
  END IF;
  
  -- Buscar convite para verificar acesso e atualizar status
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE phone = p_phone
    AND status IN ('pending', 'form_submitted', 'verification_sent')
  LIMIT 1;
  
  -- Verificar se tem acesso (via convite ou via dispositivo)
  IF v_invitation IS NOT NULL AND v_invitation.has_pwa_access IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_access',
      'message', 'Acesso não autorizado'
    );
  END IF;
  
  -- Atualizar dispositivo como verificado
  UPDATE public.pwa_user_devices
  SET is_verified = true,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      expires_at = v_now + INTERVAL '30 days',
      updated_at = v_now
  WHERE id = v_device.id;
  
  -- Atualizar convite se existir
  IF v_invitation IS NOT NULL THEN
    UPDATE public.user_invitations
    SET status = 'completed',
        accepted_at = v_now
    WHERE id = v_invitation.id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'phone', p_phone,
    'name', COALESCE(v_device.user_name, v_invitation.name),
    'has_pwa_access', true
  );
END;
$$;