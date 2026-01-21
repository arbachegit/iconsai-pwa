-- Adicionar colunas SMS na tabela admin_settings
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_as_fallback BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS twilio_sms_number TEXT DEFAULT '+17727323860';

-- Adicionar colunas para suporte a SMS e fallback na notification_logs
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS message_sid TEXT,
ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT false;

-- Criar índice para buscas por canal e status
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel_status ON notification_logs(channel, status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_fallback ON notification_logs(fallback_used) WHERE fallback_used = true;