-- =====================================================
-- PWA CITY TABLES
-- Microserviço separado do PWA principal
-- =====================================================

-- Tabela de configurações do PWA City
CREATE TABLE IF NOT EXISTS public.pwacity_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type TEXT NOT NULL DEFAULT 'text', -- text, number, boolean
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de convites do PWA City (separada do PWA)
CREATE TABLE IF NOT EXISTS public.pwacity_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de sessões do PWA City (autenticação por telefone + OTP)
CREATE TABLE IF NOT EXISTS public.pwacity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  code_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de conversas do PWA City
CREATE TABLE IF NOT EXISTS public.pwacity_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  session_id UUID REFERENCES public.pwacity_sessions(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response TEXT,
  api_provider TEXT NOT NULL, -- openai, gemini
  model_used TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pwacity_sessions_phone ON public.pwacity_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_pwacity_sessions_expires ON public.pwacity_sessions(code_expires_at);
CREATE INDEX IF NOT EXISTS idx_pwacity_invites_code ON public.pwacity_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_pwacity_invites_phone ON public.pwacity_invites(phone);
CREATE INDEX IF NOT EXISTS idx_pwacity_invites_status ON public.pwacity_invites(status);
CREATE INDEX IF NOT EXISTS idx_pwacity_conversations_phone ON public.pwacity_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_pwacity_conversations_session ON public.pwacity_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_pwacity_conversations_created ON public.pwacity_conversations(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pwacity_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwacity_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwacity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwacity_conversations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pwacity_config
-- Todos podem ler configurações
CREATE POLICY "Anyone can read pwacity_config"
  ON public.pwacity_config FOR SELECT
  USING (true);

-- Apenas admins podem atualizar configurações
CREATE POLICY "Only admins can update pwacity_config"
  ON public.pwacity_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Apenas admins podem inserir configurações
CREATE POLICY "Only admins can insert pwacity_config"
  ON public.pwacity_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Políticas RLS para pwacity_invites
-- Admins podem ver todos os convites
CREATE POLICY "Admins can view all pwacity_invites"
  ON public.pwacity_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins podem criar convites
CREATE POLICY "Admins can create pwacity_invites"
  ON public.pwacity_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins podem atualizar convites
CREATE POLICY "Admins can update pwacity_invites"
  ON public.pwacity_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Políticas RLS para pwacity_sessions
-- Service role pode gerenciar sessões (via Edge Functions)
CREATE POLICY "Service role can manage pwacity_sessions"
  ON public.pwacity_sessions FOR ALL
  USING (true);

-- Políticas RLS para pwacity_conversations
-- Service role pode gerenciar conversas (via Edge Functions)
CREATE POLICY "Service role can manage pwacity_conversations"
  ON public.pwacity_conversations FOR ALL
  USING (true);

-- Admins podem ver todas as conversas
CREATE POLICY "Admins can view all pwacity_conversations"
  ON public.pwacity_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- FUNÇÕES RPC PARA PWA CITY
-- =====================================================

-- Função para iniciar login no PWA City
CREATE OR REPLACE FUNCTION public.login_pwacity(p_phone TEXT)
RETURNS JSON AS $$
DECLARE
  v_code TEXT;
  v_invite RECORD;
  v_session_id UUID;
BEGIN
  -- Verificar se o telefone tem um convite válido
  SELECT * INTO v_invite
  FROM public.pwacity_invites
  WHERE phone = p_phone
  AND status = 'pending'
  AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Telefone não encontrado ou convite expirado'
    );
  END IF;

  -- Gerar código de verificação (6 dígitos)
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Criar ou atualizar sessão
  INSERT INTO public.pwacity_sessions (phone, verification_code, code_expires_at, failed_attempts)
  VALUES (p_phone, v_code, NOW() + INTERVAL '10 minutes', 0)
  ON CONFLICT (phone) DO UPDATE
  SET verification_code = EXCLUDED.verification_code,
      code_expires_at = EXCLUDED.code_expires_at,
      failed_attempts = 0,
      is_verified = false,
      created_at = NOW()
  RETURNING id INTO v_session_id;

  RETURN json_build_object(
    'success', true,
    'verification_code', v_code,
    'phone', p_phone,
    'user_name', v_invite.name,
    'session_id', v_session_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar código OTP do PWA City
CREATE OR REPLACE FUNCTION public.verify_pwacity_code(p_phone TEXT, p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_session RECORD;
  v_invite RECORD;
BEGIN
  -- Buscar sessão ativa
  SELECT * INTO v_session
  FROM public.pwacity_sessions
  WHERE phone = p_phone
  AND code_expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Código expirado ou sessão não encontrada'
    );
  END IF;

  -- Verificar tentativas falhadas
  IF v_session.failed_attempts >= 5 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Muitas tentativas. Solicite um novo código.'
    );
  END IF;

  -- Verificar código
  IF v_session.verification_code != p_code THEN
    -- Incrementar tentativas falhadas
    UPDATE public.pwacity_sessions
    SET failed_attempts = failed_attempts + 1
    WHERE id = v_session.id;

    RETURN json_build_object(
      'success', false,
      'error', 'Código inválido'
    );
  END IF;

  -- Código correto - marcar como verificado
  UPDATE public.pwacity_sessions
  SET is_verified = true,
      last_activity = NOW()
  WHERE id = v_session.id;

  -- Atualizar convite para aceito
  UPDATE public.pwacity_invites
  SET status = 'accepted',
      updated_at = NOW()
  WHERE phone = p_phone
  AND status = 'pending';

  -- Buscar dados do usuário
  SELECT * INTO v_invite
  FROM public.pwacity_invites
  WHERE phone = p_phone
  LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'user_name', v_invite.name,
    'expires_at', v_session.code_expires_at,
    'session_id', v_session.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar acesso ao PWA City
CREATE OR REPLACE FUNCTION public.check_pwacity_access(p_phone TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_session RECORD;
BEGIN
  -- Verificar se tem convite válido
  SELECT * INTO v_invite
  FROM public.pwacity_invites
  WHERE phone = p_phone
  AND status = 'accepted'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'has_access', false,
      'error', 'Sem acesso ao PWA City'
    );
  END IF;

  -- Verificar sessão ativa
  SELECT * INTO v_session
  FROM public.pwacity_sessions
  WHERE phone = p_phone
  AND is_verified = true
  ORDER BY last_activity DESC
  LIMIT 1;

  IF FOUND THEN
    -- Atualizar última atividade
    UPDATE public.pwacity_sessions
    SET last_activity = NOW()
    WHERE id = v_session.id;

    RETURN json_build_object(
      'has_access', true,
      'user_name', v_invite.name,
      'session_id', v_session.id
    );
  ELSE
    RETURN json_build_object(
      'has_access', false,
      'error', 'Sessão não encontrada. Faça login novamente.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar constraint única para telefone em sessões (um telefone = uma sessão ativa)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pwacity_sessions_phone_unique
ON public.pwacity_sessions(phone)
WHERE is_verified = true;

-- =====================================================
-- CONFIGURAÇÕES PADRÃO DO PWA CITY
-- =====================================================

INSERT INTO public.pwacity_config (config_key, config_value, config_type, description) VALUES
  ('allow_desktop_access', 'false', 'boolean', 'Permitir acesso desktop (apenas admin/superadmin)'),
  ('default_api_provider', 'openai', 'text', 'Provedor de API padrão (openai ou gemini)'),
  ('openai_model', 'gpt-4', 'text', 'Modelo OpenAI a ser usado'),
  ('gemini_model', 'gemini-pro', 'text', 'Modelo Gemini a ser usado'),
  ('max_tokens', '2000', 'number', 'Máximo de tokens por resposta'),
  ('temperature', '0.7', 'number', 'Temperatura da resposta (0-1)'),
  ('welcome_text', 'Bem-vindo ao PWA City! Como posso ajudar você hoje?', 'text', 'Texto de boas-vindas')
ON CONFLICT (config_key) DO NOTHING;

-- Comentários nas tabelas
COMMENT ON TABLE public.pwacity_config IS 'Configurações do PWA City';
COMMENT ON TABLE public.pwacity_invites IS 'Convites para acesso ao PWA City';
COMMENT ON TABLE public.pwacity_sessions IS 'Sessões de autenticação do PWA City (telefone + OTP)';
COMMENT ON TABLE public.pwacity_conversations IS 'Histórico de conversas no PWA City';
