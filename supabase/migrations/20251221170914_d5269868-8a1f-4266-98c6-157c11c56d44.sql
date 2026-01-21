-- =============================================
-- TABELA app_config PARA CONFIGURAÇÕES GENÉRICAS
-- =============================================

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS para app_config
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage app_config" ON public.app_config
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Public read app_config" ON public.app_config
  FOR SELECT USING (true);

-- Inserir configurações padrão (voz, memória, analytics)
INSERT INTO public.app_config (key, value, category, description) VALUES
  ('voice.silence_threshold', '15', 'voice', 'Threshold de silêncio para VAD (0-255)'),
  ('voice.vad_check_interval', '100', 'voice', 'Intervalo de verificação VAD (ms)'),
  ('voice.initial_wait_ms', '10000', 'voice', 'Tempo inicial de espera antes de "não ouvi" (ms)'),
  ('voice.silence_wait_ms', '5000', 'voice', 'Tempo de espera após silêncio detectado (ms)'),
  ('voice.countdown_seconds', '5', 'voice', 'Segundos de contagem regressiva'),
  ('memory.warning_threshold', '0.70', 'system', 'Threshold de aviso de memória (0-1)'),
  ('memory.critical_threshold', '0.85', 'system', 'Threshold crítico de memória (0-1)'),
  ('chat.max_file_records', '5000', 'chat', 'Máximo de registros por arquivo exportado'),
  ('analytics.max_records_per_state', '12', 'analytics', 'Máximo de registros por estado no dashboard'),
  ('analytics.max_history_items', '5', 'analytics', 'Máximo de itens no histórico'),
  ('security.whitelisted_domains', '["localhost", "127.0.0.1", "lovable.app", "lovableproject.com", "gptengineer.run", "webcontainer.io"]', 'security', 'Domínios na whitelist (desenvolvimento)')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- ADICIONAR COLUNAS NA security_whitelist
-- =============================================

ALTER TABLE public.security_whitelist
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whitelist_device ON public.security_whitelist(device_fingerprint) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whitelist_user ON public.security_whitelist(user_id) WHERE is_active = true;

-- =============================================
-- ADICIONAR COLUNAS DE MENSAGENS CONFIGURÁVEIS NA security_shield_config
-- =============================================

ALTER TABLE public.security_shield_config
ADD COLUMN IF NOT EXISTS first_warning_message TEXT DEFAULT 'Atenção! Violação de segurança detectada. Tentativas restantes: {remaining}',
ADD COLUMN IF NOT EXISTS block_message TEXT DEFAULT 'Seu acesso foi bloqueado por violações de segurança.',
ADD COLUMN IF NOT EXISTS console_warning_title TEXT DEFAULT '⛔ ACESSO RESTRITO',
ADD COLUMN IF NOT EXISTS console_warning_subtitle TEXT DEFAULT 'Sistema de Segurança KnowYOU v4',
ADD COLUMN IF NOT EXISTS console_warning_body TEXT DEFAULT 'Qualquer tentativa de inspeção resultará em banimento.';