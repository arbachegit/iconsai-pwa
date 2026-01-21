-- 1. Adicionar campos em user_invitations
ALTER TABLE public.user_invitations 
ADD COLUMN IF NOT EXISTS has_platform_access BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_app_access BOOLEAN DEFAULT false;

-- 2. Adicionar campos em user_registrations
ALTER TABLE public.user_registrations 
ADD COLUMN IF NOT EXISTS has_platform_access BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_app_access BOOLEAN DEFAULT false;

-- 3. Adicionar campos em pwa_sessions
ALTER TABLE public.pwa_sessions
ADD COLUMN IF NOT EXISTS has_app_access BOOLEAN DEFAULT true;

-- 4. Migrar dados existentes (quem tem pwa_access[] → has_app_access = true)
UPDATE public.user_invitations 
SET has_app_access = true 
WHERE pwa_access IS NOT NULL AND array_length(pwa_access, 1) > 0;

UPDATE public.user_registrations 
SET has_app_access = true 
WHERE pwa_access IS NOT NULL AND array_length(pwa_access, 1) > 0;

-- 5. Atualizar a função check_pwa_access para usar has_app_access
CREATE OR REPLACE FUNCTION public.check_pwa_access(
  p_device_id TEXT,
  p_agent_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Buscar sessão ativa pelo device_id
  SELECT ps.*, ur.email as user_email, ur.has_app_access as user_has_app_access
  INTO v_session
  FROM public.pwa_sessions ps
  LEFT JOIN public.user_registrations ur ON ur.id = ps.user_id
  WHERE ps.device_id = p_device_id
    AND ps.is_active = true
  ORDER BY ps.last_interaction DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'no_session',
      'message', 'Sessão não encontrada. Faça o cadastro.'
    );
  END IF;
  
  -- Verificar se tem acesso ao APP (verificar na sessão ou no registro do usuário)
  IF NOT COALESCE(v_session.has_app_access, v_session.user_has_app_access, false) THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'no_app_access',
      'message', 'Você não tem acesso ao APP. Contate o administrador.'
    );
  END IF;
  
  -- Acesso permitido (ignora slug, pois todos os slugs são liberados)
  RETURN jsonb_build_object(
    'has_access', true,
    'session_id', v_session.id,
    'user_name', v_session.user_name
  );
END;
$$;