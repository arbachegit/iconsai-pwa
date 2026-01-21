-- =====================================================
-- PWA HEALTH TABLES
-- Microserviço separado focado em triagem médica
-- =====================================================

-- Tabela de configurações do PWA Health
CREATE TABLE IF NOT EXISTS public.pwahealth_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type TEXT NOT NULL DEFAULT 'text', -- text, number, boolean
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de convites do PWA Health (separada do PWA)
CREATE TABLE IF NOT EXISTS public.pwahealth_invites (
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

-- Tabela de sessões do PWA Health (autenticação por telefone + OTP)
CREATE TABLE IF NOT EXISTS public.pwahealth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  code_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de conversas do PWA Health (foco em triagem médica)
CREATE TABLE IF NOT EXISTS public.pwahealth_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  session_id UUID REFERENCES public.pwahealth_sessions(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response TEXT,
  api_provider TEXT NOT NULL, -- openai, gemini
  model_used TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, error
  error_message TEXT,
  -- Campos específicos de triagem médica (protocolo OLDCARTS)
  medical_context JSONB, -- armazena contexto médico estruturado
  severity_level TEXT, -- low, medium, high, urgent
  symptoms TEXT[], -- lista de sintomas identificados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pwahealth_sessions_phone ON public.pwahealth_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_pwahealth_sessions_expires ON public.pwahealth_sessions(code_expires_at);
CREATE INDEX IF NOT EXISTS idx_pwahealth_invites_code ON public.pwahealth_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_pwahealth_invites_phone ON public.pwahealth_invites(phone);
CREATE INDEX IF NOT EXISTS idx_pwahealth_invites_status ON public.pwahealth_invites(status);
CREATE INDEX IF NOT EXISTS idx_pwahealth_conversations_phone ON public.pwahealth_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_pwahealth_conversations_session ON public.pwahealth_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_pwahealth_conversations_created ON public.pwahealth_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwahealth_conversations_severity ON public.pwahealth_conversations(severity_level);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pwahealth_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwahealth_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwahealth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwahealth_conversations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pwahealth_config
-- Todos podem ler configurações
CREATE POLICY "Anyone can read pwahealth_config"
  ON public.pwahealth_config FOR SELECT
  USING (true);

-- Apenas admins podem atualizar configurações
CREATE POLICY "Only admins can update pwahealth_config"
  ON public.pwahealth_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Apenas admins podem inserir configurações
CREATE POLICY "Only admins can insert pwahealth_config"
  ON public.pwahealth_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Políticas RLS para pwahealth_invites
-- Admins podem ver todos os convites
CREATE POLICY "Admins can view all pwahealth_invites"
  ON public.pwahealth_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins podem criar convites
CREATE POLICY "Admins can create pwahealth_invites"
  ON public.pwahealth_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins podem atualizar convites
CREATE POLICY "Admins can update pwahealth_invites"
  ON public.pwahealth_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Políticas RLS para pwahealth_sessions
-- Service role pode gerenciar sessões (via Edge Functions)
CREATE POLICY "Service role can manage pwahealth_sessions"
  ON public.pwahealth_sessions FOR ALL
  USING (true);

-- Políticas RLS para pwahealth_conversations
-- Service role pode gerenciar conversas (via Edge Functions)
CREATE POLICY "Service role can manage pwahealth_conversations"
  ON public.pwahealth_conversations FOR ALL
  USING (true);

-- Admins podem ver todas as conversas
CREATE POLICY "Admins can view all pwahealth_conversations"
  ON public.pwahealth_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- FUNÇÕES RPC PARA PWA HEALTH
-- =====================================================

-- Função para iniciar login no PWA Health
CREATE OR REPLACE FUNCTION public.login_pwahealth(p_phone TEXT)
RETURNS JSON AS $$
DECLARE
  v_code TEXT;
  v_invite RECORD;
  v_session_id UUID;
BEGIN
  -- Verificar se o telefone tem um convite válido
  SELECT * INTO v_invite
  FROM public.pwahealth_invites
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
  INSERT INTO public.pwahealth_sessions (phone, verification_code, code_expires_at, failed_attempts)
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

-- Função para verificar código OTP do PWA Health
CREATE OR REPLACE FUNCTION public.verify_pwahealth_code(p_phone TEXT, p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_session RECORD;
  v_invite RECORD;
BEGIN
  -- Buscar sessão ativa
  SELECT * INTO v_session
  FROM public.pwahealth_sessions
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
    UPDATE public.pwahealth_sessions
    SET failed_attempts = failed_attempts + 1
    WHERE id = v_session.id;

    RETURN json_build_object(
      'success', false,
      'error', 'Código inválido'
    );
  END IF;

  -- Código correto - marcar como verificado
  UPDATE public.pwahealth_sessions
  SET is_verified = true,
      last_activity = NOW()
  WHERE id = v_session.id;

  -- Atualizar convite para aceito
  UPDATE public.pwahealth_invites
  SET status = 'accepted',
      updated_at = NOW()
  WHERE phone = p_phone
  AND status = 'pending';

  -- Buscar dados do usuário
  SELECT * INTO v_invite
  FROM public.pwahealth_invites
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

-- Função para verificar acesso ao PWA Health
CREATE OR REPLACE FUNCTION public.check_pwahealth_access(p_phone TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_session RECORD;
BEGIN
  -- Verificar se tem convite válido
  SELECT * INTO v_invite
  FROM public.pwahealth_invites
  WHERE phone = p_phone
  AND status = 'accepted'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'has_access', false,
      'error', 'Sem acesso ao PWA Health'
    );
  END IF;

  -- Verificar sessão ativa
  SELECT * INTO v_session
  FROM public.pwahealth_sessions
  WHERE phone = p_phone
  AND is_verified = true
  ORDER BY last_activity DESC
  LIMIT 1;

  IF FOUND THEN
    -- Atualizar última atividade
    UPDATE public.pwahealth_sessions
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_pwahealth_sessions_phone_unique
ON public.pwahealth_sessions(phone)
WHERE is_verified = true;

-- =====================================================
-- CONFIGURAÇÕES PADRÃO DO PWA HEALTH
-- =====================================================

INSERT INTO public.pwahealth_config (config_key, config_value, config_type, description) VALUES
  ('allow_desktop_access', 'false', 'boolean', 'Permitir acesso desktop (apenas admin/superadmin)'),
  ('default_api_provider', 'openai', 'text', 'Provedor de API padrão (openai ou gemini)'),
  ('openai_model', 'gpt-4', 'text', 'Modelo OpenAI a ser usado'),
  ('gemini_model', 'gemini-pro', 'text', 'Modelo Gemini a ser usado'),
  ('max_tokens', '2000', 'number', 'Máximo de tokens por resposta'),
  ('temperature', '0.7', 'number', 'Temperatura da resposta (0-1)'),
  ('welcome_text', 'Bem-vindo ao Knowyou AI Saúde! Vou fazer algumas perguntas para entender melhor sua situação de saúde.', 'text', 'Texto de boas-vindas'),
  ('tts_voice', 'MF3mGyEYCl7XYWbV9V6O', 'text', 'ID da voz ElevenLabs para TTS'),
  ('voice_stability', '0.5', 'number', 'Estabilidade da voz (0-1)'),
  ('voice_similarity', '0.75', 'number', 'Similaridade da voz (0-1)'),
  ('voice_style', '0.0', 'number', 'Estilo da voz (0-1)'),
  ('voice_speed', '1.0', 'number', 'Velocidade da voz (0.5-2.0)'),
  ('voice_speaker_boost', 'true', 'boolean', 'Boost do speaker'),
  ('mic_timeout_seconds', '30', 'number', 'Timeout do microfone em segundos'),
  ('enable_countdown', 'true', 'boolean', 'Habilitar contagem regressiva'),
  ('splash_duration_ms', '3000', 'number', 'Duração do splash screen em ms'),
  ('oldcarts_protocol', 'true', 'boolean', 'Usar protocolo OLDCARTS para triagem'),
  ('emergency_keywords', '["infarto", "derrame", "avc", "inconsciência", "parada cardíaca", "hemorragia grave"]', 'text', 'Keywords de emergência (JSON array)'),
  ('severity_thresholds', '{"low": 3, "medium": 5, "high": 7, "urgent": 9}', 'text', 'Thresholds de severidade (JSON object)')
ON CONFLICT (config_key) DO NOTHING;

-- Comentários nas tabelas
COMMENT ON TABLE public.pwahealth_config IS 'Configurações do PWA Health';
COMMENT ON TABLE public.pwahealth_invites IS 'Convites para acesso ao PWA Health';
COMMENT ON TABLE public.pwahealth_sessions IS 'Sessões de autenticação do PWA Health (telefone + OTP)';
COMMENT ON TABLE public.pwahealth_conversations IS 'Histórico de conversas médicas no PWA Health';
COMMENT ON COLUMN public.pwahealth_conversations.medical_context IS 'Contexto médico estruturado (protocolo OLDCARTS)';
COMMENT ON COLUMN public.pwahealth_conversations.severity_level IS 'Nível de severidade: low, medium, high, urgent';
COMMENT ON COLUMN public.pwahealth_conversations.symptoms IS 'Lista de sintomas identificados';
