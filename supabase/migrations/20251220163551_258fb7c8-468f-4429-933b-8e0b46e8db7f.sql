-- =====================================================
-- PWA INVITATION SYSTEM - Sistema de Convites MultiAgente
-- =====================================================

-- 1. Criar tabela pwa_user_devices (dispositivos vinculados)
CREATE TABLE IF NOT EXISTS public.pwa_user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_registrations(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- 2. Adicionar campos em user_invitations
ALTER TABLE public.user_invitations 
ADD COLUMN IF NOT EXISTS pwa_access TEXT[] DEFAULT '{}';

-- 3. Adicionar campos em user_registrations
ALTER TABLE public.user_registrations 
ADD COLUMN IF NOT EXISTS pwa_access TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pwa_registered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS registration_source TEXT DEFAULT 'admin';

-- 4. Adicionar campos em pwa_sessions
ALTER TABLE public.pwa_sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_registrations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS pwa_access TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 5. Habilitar RLS na nova tabela
ALTER TABLE public.pwa_user_devices ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para pwa_user_devices
CREATE POLICY "Admins can manage pwa_user_devices" ON public.pwa_user_devices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert pwa_user_devices" ON public.pwa_user_devices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read own device" ON public.pwa_user_devices
  FOR SELECT USING (true);

CREATE POLICY "System can update pwa_user_devices" ON public.pwa_user_devices
  FOR UPDATE USING (true);

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_pwa_user_devices_user_id ON public.pwa_user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_user_devices_device_id ON public.pwa_user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_token ON public.pwa_sessions(token);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_user_id ON public.pwa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_pwa_access ON public.user_invitations USING GIN(pwa_access);

-- =====================================================
-- FUNÇÕES SQL
-- =====================================================

-- 8. Função: verify_pwa_invitation - Verifica se um convite é válido
CREATE OR REPLACE FUNCTION public.verify_pwa_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Buscar convite pelo token
  SELECT 
    id, name, email, phone, role, pwa_access, expires_at, status
  INTO v_invitation
  FROM public.user_invitations
  WHERE token = p_token
  LIMIT 1;
  
  -- Se não encontrou
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Convite não encontrado'
    );
  END IF;
  
  -- Se já foi usado
  IF v_invitation.status NOT IN ('pending', 'form_submitted') THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Este convite já foi utilizado'
    );
  END IF;
  
  -- Se expirou
  IF v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Este convite expirou'
    );
  END IF;
  
  -- Convite válido
  RETURN jsonb_build_object(
    'valid', true,
    'invitation_id', v_invitation.id,
    'name', v_invitation.name,
    'email', v_invitation.email,
    'phone', v_invitation.phone,
    'role', v_invitation.role,
    'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY[]::TEXT[]),
    'expires_at', v_invitation.expires_at
  );
END;
$$;

-- 9. Função: register_pwa_user - Registra usuário via PWA
CREATE OR REPLACE FUNCTION public.register_pwa_user(
  p_invitation_token TEXT,
  p_device_id TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_session_token TEXT;
  v_session_expires TIMESTAMPTZ;
BEGIN
  -- 1. Verificar convite
  SELECT 
    id, name, email, phone, role, pwa_access, status, expires_at
  INTO v_invitation
  FROM public.user_invitations
  WHERE token = p_invitation_token
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite não encontrado'
    );
  END IF;
  
  IF v_invitation.status NOT IN ('pending', 'form_submitted') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este convite já foi utilizado'
    );
  END IF;
  
  IF v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este convite expirou'
    );
  END IF;
  
  -- 2. Criar ou atualizar user_registration
  INSERT INTO public.user_registrations (
    first_name,
    last_name,
    email,
    phone,
    role,
    status,
    pwa_access,
    pwa_registered_at,
    registration_source,
    approved_at
  ) VALUES (
    SPLIT_PART(p_name, ' ', 1),
    CASE WHEN POSITION(' ' IN p_name) > 0 THEN SUBSTRING(p_name FROM POSITION(' ' IN p_name) + 1) ELSE '' END,
    LOWER(p_email),
    COALESCE(p_phone, v_invitation.phone),
    v_invitation.role,
    'approved',
    COALESCE(v_invitation.pwa_access, ARRAY[]::TEXT[]),
    NOW(),
    'pwa',
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    pwa_access = COALESCE(EXCLUDED.pwa_access, user_registrations.pwa_access),
    pwa_registered_at = NOW(),
    phone = COALESCE(EXCLUDED.phone, user_registrations.phone)
  RETURNING id INTO v_user_id;
  
  -- 3. Gerar token de sessão (64 hex chars)
  SELECT encode(gen_random_bytes(32), 'hex') INTO v_session_token;
  v_session_expires := NOW() + INTERVAL '30 days';
  
  -- 4. Criar ou atualizar pwa_session
  INSERT INTO public.pwa_sessions (
    device_id,
    user_id,
    user_name,
    token,
    pwa_access,
    expires_at,
    is_active,
    last_interaction
  ) VALUES (
    p_device_id,
    v_user_id,
    p_name,
    v_session_token,
    COALESCE(v_invitation.pwa_access, ARRAY[]::TEXT[]),
    v_session_expires,
    true,
    NOW()
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_id = v_user_id,
    user_name = p_name,
    token = v_session_token,
    pwa_access = COALESCE(EXCLUDED.pwa_access, pwa_sessions.pwa_access),
    expires_at = v_session_expires,
    is_active = true,
    last_interaction = NOW();
  
  -- 5. Vincular dispositivo
  INSERT INTO public.pwa_user_devices (
    user_id,
    device_id,
    device_name,
    user_agent,
    last_used_at
  ) VALUES (
    v_user_id,
    p_device_id,
    'Dispositivo PWA',
    p_user_agent,
    NOW()
  )
  ON CONFLICT (user_id, device_id) DO UPDATE SET
    last_used_at = NOW(),
    user_agent = COALESCE(EXCLUDED.user_agent, pwa_user_devices.user_agent);
  
  -- 6. Marcar convite como utilizado
  UPDATE public.user_invitations
  SET status = 'completed', used_at = NOW()
  WHERE token = p_invitation_token;
  
  -- 7. Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'session_token', v_session_token,
    'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY[]::TEXT[]),
    'expires_at', v_session_expires,
    'message', 'Cadastro realizado com sucesso!'
  );
END;
$$;

-- 10. Função: check_pwa_access - Verifica se dispositivo tem acesso a um agente
CREATE OR REPLACE FUNCTION public.check_pwa_access(
  p_device_id TEXT,
  p_agent_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session RECORD;
  v_has_access BOOLEAN;
BEGIN
  -- Buscar sessão ativa pelo device_id
  SELECT 
    ps.id, ps.user_id, ps.user_name, ps.pwa_access, ps.expires_at, ps.is_active,
    ur.email as user_email
  INTO v_session
  FROM public.pwa_sessions ps
  LEFT JOIN public.user_registrations ur ON ur.id = ps.user_id
  WHERE ps.device_id = p_device_id
    AND ps.is_active = true
  ORDER BY ps.last_interaction DESC
  LIMIT 1;
  
  -- Se não tem sessão
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'no_session',
      'message', 'Sessão não encontrada. Faça o cadastro.'
    );
  END IF;
  
  -- Se sessão expirou
  IF v_session.expires_at IS NOT NULL AND v_session.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'expired',
      'message', 'Sua sessão expirou. Faça login novamente.'
    );
  END IF;
  
  -- Verificar acesso ao agente específico (se informado)
  IF p_agent_slug IS NOT NULL THEN
    v_has_access := p_agent_slug = ANY(v_session.pwa_access) 
                    OR array_length(v_session.pwa_access, 1) IS NULL 
                    OR array_length(v_session.pwa_access, 1) = 0;
  ELSE
    v_has_access := true;
  END IF;
  
  IF NOT v_has_access THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'unauthorized',
      'message', 'Você não tem acesso a este agente.'
    );
  END IF;
  
  -- Atualizar última interação
  UPDATE public.pwa_sessions 
  SET last_interaction = NOW()
  WHERE device_id = p_device_id;
  
  -- Retornar sucesso
  RETURN jsonb_build_object(
    'has_access', true,
    'user_id', v_session.user_id,
    'user_name', v_session.user_name,
    'user_email', v_session.user_email,
    'pwa_access', COALESCE(v_session.pwa_access, ARRAY[]::TEXT[])
  );
END;
$$;