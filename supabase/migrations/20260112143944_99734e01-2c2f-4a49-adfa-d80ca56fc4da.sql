-- Corrigir função verify_pwa_code_simple
-- Trocar 'accepted' por 'completed' para respeitar o constraint user_invitations_status_check

CREATE OR REPLACE FUNCTION verify_pwa_code_simple(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_now TIMESTAMPTZ := now();
  v_code_expiry INTERVAL := INTERVAL '10 minutes';
BEGIN
  -- Normalizar telefone
  p_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Buscar convite com código válido
  SELECT *
  INTO v_invitation
  FROM public.user_invitations
  WHERE phone = p_phone
    AND verification_code = p_code
    AND verification_sent_at > (v_now - v_code_expiry)
    AND status IN ('pending', 'form_submitted', 'verification_sent')
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido ou expirado'
    );
  END IF;
  
  -- Verificar se tem acesso
  IF v_invitation.has_pwa_access IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_access',
      'message', 'Acesso não autorizado'
    );
  END IF;
  
  -- Atualizar status do convite para 'completed' (não 'accepted')
  UPDATE public.user_invitations
  SET status = 'completed',
      accepted_at = v_now
  WHERE id = v_invitation.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'phone', p_phone,
    'name', v_invitation.name,
    'has_pwa_access', true
  );
END;
$$;