-- login_pwa v2.1 - CORRIGIDA com nomes de colunas corretos
-- Esta função permite autenticação multi-dispositivo pelo mesmo número de telefone

CREATE OR REPLACE FUNCTION public.login_pwa(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_session RECORD;
  v_code TEXT;
  v_phone TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Normalizar telefone (remover caracteres não numéricos)
  v_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Adicionar código do país se necessário
  IF length(v_phone) = 11 THEN
    v_phone := '55' || v_phone;
  END IF;

  -- 1. VERIFICAR SE TEM CONVITE ACEITO
  SELECT * INTO v_invite
  FROM pwa_invites
  WHERE phone = v_phone AND status = 'accepted'
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_invitation',
      'phone', v_phone
    );
  END IF;

  -- 2. VERIFICAR SE JÁ TEM SESSÃO VERIFICADA (para multi-dispositivo)
  SELECT * INTO v_session
  FROM pwa_sessions
  WHERE phone = v_phone AND is_verified = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se já tem sessão verificada, permite acesso direto (multi-dispositivo)
  IF v_session IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'user_name', v_session.user_name,
      'phone', v_phone
    );
  END IF;

  -- 3. CRIAR NOVA SESSÃO COM CÓDIGO DE VERIFICAÇÃO
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Deletar sessões não verificadas antigas deste telefone
  DELETE FROM pwa_sessions WHERE phone = v_phone AND is_verified = false;

  -- Inserir nova sessão com nomes de colunas CORRETOS
  INSERT INTO pwa_sessions (
    phone,
    user_name,
    verification_code,
    is_verified,
    verification_code_expires_at,
    verification_attempts,
    created_at,
    updated_at
  )
  VALUES (
    v_phone,
    v_invite.name,
    v_code,
    false,
    v_now + INTERVAL '10 minutes',
    0,
    v_now,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'verification_code', v_code,
    'user_name', v_invite.name,
    'phone', v_phone,
    'expires_in', 600
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
