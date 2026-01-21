-- Criar tabela version_control
CREATE TABLE public.version_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_version TEXT NOT NULL DEFAULT '0.0.0',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_message TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('AUTO_PATCH', 'MANUAL_MINOR', 'MANUAL_MAJOR', 'INITIAL')),
  associated_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.version_control ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage version_control"
  ON public.version_control FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can read version_control"
  ON public.version_control FOR SELECT
  USING (true);

-- Criar índice para ordenação por timestamp
CREATE INDEX idx_version_control_timestamp ON public.version_control(timestamp DESC);

-- Inserir versão inicial
INSERT INTO public.version_control (current_version, log_message, trigger_type, associated_data)
VALUES ('0.0.0', 'Versão inicial do sistema de versionamento', 'INITIAL', '{"initialized": true}'::jsonb);