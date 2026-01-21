-- WhatsApp Tier Monitoring - FASE 1: Tabelas

-- Tabela para métricas diárias de WhatsApp
CREATE TABLE public.whatsapp_daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL UNIQUE,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  messages_delivered INTEGER NOT NULL DEFAULT 0,
  messages_failed INTEGER NOT NULL DEFAULT 0,
  messages_queued INTEGER NOT NULL DEFAULT 0,
  template_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para status do tier atual
CREATE TABLE public.whatsapp_tier_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_tier INTEGER NOT NULL DEFAULT 0,
  messaging_limit INTEGER NOT NULL DEFAULT 250,
  quality_rating TEXT NOT NULL DEFAULT 'unknown',
  phone_status TEXT NOT NULL DEFAULT 'connected',
  business_verified BOOLEAN NOT NULL DEFAULT false,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para eventos de qualidade (bloqueios, denúncias)
CREATE TABLE public.whatsapp_quality_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_whatsapp_daily_metrics_date ON public.whatsapp_daily_metrics(metric_date DESC);
CREATE INDEX idx_whatsapp_quality_events_date ON public.whatsapp_quality_events(event_date DESC);
CREATE INDEX idx_whatsapp_quality_events_type ON public.whatsapp_quality_events(event_type);

-- Enable RLS
ALTER TABLE public.whatsapp_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_tier_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_quality_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins autenticados
CREATE POLICY "Admins can read whatsapp_daily_metrics"
  ON public.whatsapp_daily_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage whatsapp_daily_metrics"
  ON public.whatsapp_daily_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can read whatsapp_tier_status"
  ON public.whatsapp_tier_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage whatsapp_tier_status"
  ON public.whatsapp_tier_status FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can read whatsapp_quality_events"
  ON public.whatsapp_quality_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage whatsapp_quality_events"
  ON public.whatsapp_quality_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_daily_metrics_updated_at
  BEFORE UPDATE ON public.whatsapp_daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_tier_status_updated_at
  BEFORE UPDATE ON public.whatsapp_tier_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir registro inicial de tier status
INSERT INTO public.whatsapp_tier_status (current_tier, messaging_limit, quality_rating, phone_status, business_verified)
VALUES (0, 250, 'unknown', 'connected', false);