-- ============================================
-- PART 3 & 5: Fallback Logs and Config Tables
-- ============================================

-- Tabela para logar fallbacks de WhatsApp para SMS
CREATE TABLE IF NOT EXISTS notification_fallback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_channel TEXT NOT NULL,
  fallback_channel TEXT NOT NULL,
  reason TEXT NOT NULL,
  recipient TEXT NOT NULL,
  notification_id UUID REFERENCES notification_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_fallback_logs_created_at ON notification_fallback_logs(created_at DESC);
CREATE INDEX idx_fallback_logs_reason ON notification_fallback_logs(reason);
CREATE INDEX idx_fallback_logs_notification_id ON notification_fallback_logs(notification_id);

-- RLS
ALTER TABLE notification_fallback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access fallback logs"
  ON notification_fallback_logs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read fallback logs"
  ON notification_fallback_logs FOR SELECT
  TO authenticated USING (true);

-- Tabela de configuração de fallback
CREATE TABLE IF NOT EXISTS notification_fallback_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  threshold_percent INTEGER NOT NULL DEFAULT 80 CHECK (threshold_percent >= 50 AND threshold_percent <= 95),
  sms_provider TEXT NOT NULL DEFAULT 'infobip' CHECK (sms_provider IN ('infobip', 'twilio')),
  alert_on_fallback BOOLEAN NOT NULL DEFAULT true,
  alert_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para config
ALTER TABLE notification_fallback_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access fallback config"
  ON notification_fallback_config FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated manage fallback config"
  ON notification_fallback_config FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_notification_fallback_config_updated_at
  BEFORE UPDATE ON notification_fallback_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config
INSERT INTO notification_fallback_config (enabled, threshold_percent, sms_provider, alert_on_fallback)
VALUES (true, 80, 'infobip', true)
ON CONFLICT DO NOTHING;