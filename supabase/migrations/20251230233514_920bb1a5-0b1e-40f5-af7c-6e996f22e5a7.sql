-- Adicionar campos para rastreio real de entrega do WhatsApp/SMS
ALTER TABLE public.notification_logs
ADD COLUMN IF NOT EXISTS provider_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS provider_error_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS final_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS final_status_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_attempts integer DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN public.notification_logs.message_sid IS 'ID da mensagem no provedor (Twilio SID)';
COMMENT ON COLUMN public.notification_logs.provider_status IS 'Status inicial do provedor (queued, sent, accepted)';
COMMENT ON COLUMN public.notification_logs.provider_error_code IS 'Código de erro do provedor quando falha';
COMMENT ON COLUMN public.notification_logs.final_status IS 'Status final de entrega (delivered, undelivered, failed, read)';
COMMENT ON COLUMN public.notification_logs.final_status_at IS 'Timestamp da atualização do status final';
COMMENT ON COLUMN public.notification_logs.delivery_attempts IS 'Número de tentativas de entrega';