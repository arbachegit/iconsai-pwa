-- Create function to complete PWA registration with code verification
CREATE OR REPLACE FUNCTION complete_pwa_registration_with_code(
  p_invitation_token TEXT,
  p_device_id TEXT,
  p_verification_code TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_result JSONB;
BEGIN
  -- 1. Buscar convite
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_invitation_token
    AND status IN ('pending', 'form_submitted', 'verification_sent')
    AND expires_at > NOW()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;
  
  -- 2. Verificar se código foi enviado
  IF v_invitation.verification_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de verificação não foi enviado. Solicite um novo.');
  END IF;
  
  -- 3. Verificar limite de tentativas
  IF COALESCE(v_invitation.verification_attempts, 0) >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Muitas tentativas incorretas. Solicite um novo código.');
  END IF;
  
  -- 4. Verificar expiração do código
  IF v_invitation.verification_code_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código expirado. Solicite um novo.');
  END IF;
  
  -- 5. Verificar se código está correto
  IF v_invitation.verification_code != p_verification_code THEN
    -- Incrementar tentativas
    UPDATE user_invitations
    SET verification_attempts = COALESCE(verification_attempts, 0) + 1
    WHERE id = v_invitation.id;
    
    RETURN jsonb_build_object('success', false, 'error', 'Código incorreto. Tente novamente.');
  END IF;
  
  -- 6. Código válido! Chamar função original de registro
  v_result := register_pwa_user(
    p_invitation_token,
    p_device_id,
    v_invitation.name,
    v_invitation.email,
    v_invitation.phone,
    p_user_agent
  );
  
  -- 7. Limpar código após uso bem-sucedido
  IF (v_result->>'success')::boolean THEN
    UPDATE user_invitations
    SET verification_code = NULL,
        verification_code_expires_at = NULL,
        verification_attempts = 0
    WHERE id = v_invitation.id;
  END IF;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION complete_pwa_registration_with_code(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION complete_pwa_registration_with_code(TEXT, TEXT, TEXT, TEXT) TO authenticated;