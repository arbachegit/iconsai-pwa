-- Create notification_templates table for customizable message templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  platform_name TEXT NOT NULL DEFAULT 'KnowYOU Admin',
  email_subject TEXT,
  email_body TEXT,
  whatsapp_message TEXT,
  variables_available TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage notification templates" 
ON public.notification_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_templates_updated_at();

-- Insert default templates for all 11 event types
INSERT INTO public.notification_templates (event_type, platform_name, email_subject, email_body, whatsapp_message, variables_available) VALUES
  ('new_document', 'KnowYOU Admin', '📄 Novo Documento RAG Adicionado', 'Um novo documento foi processado e adicionado ao sistema RAG: {event_details}', '📄 Novo Documento RAG\n\n{event_details}\n\nProcessado em: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('document_failed', 'KnowYOU Admin', '❌ Falha no Processamento de Documento', 'O documento "{event_details}" falhou no processamento.', '❌ Falha no Documento\n\nErro: {event_details}\n\nHorário: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('new_contact_message', 'KnowYOU Admin', '📬 Nova Mensagem de Contato', 'Nova mensagem de contato recebida: {event_details}', '📬 Nova Mensagem de Contato\n\n{event_details}\n\nRecebida em: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('security_alert', 'KnowYOU Admin', '🛡️ Alerta de Segurança', 'Alerta de segurança detectado: {event_details}', '🛡️ Alerta de Segurança\n\n{event_details}\n\nDetectado em: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('ml_accuracy_drop', 'KnowYOU Admin', '📉 Queda de Precisão ML Detectada', 'A precisão do sistema ML caiu: {event_details}', '📉 Queda ML\n\n{event_details}\n\nHorário: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('new_conversation', 'KnowYOU Admin', '💬 Nova Conversa de Usuário', 'Nova conversa iniciada: {event_details}', '💬 Nova Conversa\n\n{event_details}\n\nIniciada em: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('password_reset', 'KnowYOU Admin', '🔑 Solicitação de Recuperação de Senha', 'Uma solicitação de recuperação de senha foi feita: {event_details}', '🔑 Recuperação de Senha\n\nUsuário: {event_details}\n\nHorário: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('login_alert', 'KnowYOU Admin', '🚨 Alerta de Login Suspeito', 'Login detectado em novo dispositivo: {event_details}', '🚨 Login Suspeito\n\n{event_details}\n\nDetectado em: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('sentiment_alert', 'KnowYOU Admin', '😔 Alerta de Sentimento Negativo Detectado', 'Sentimento negativo detectado: {event_details}', '😔 Sentimento Negativo\n\n{event_details}\n\nDetectado em: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('taxonomy_anomaly', 'KnowYOU Admin', '⚠️ Anomalia de Taxonomia Detectada', 'Problema detectado com taxonomia: {event_details}', '⚠️ Anomalia Taxonomia\n\n{event_details}\n\nHorário: {timestamp}', ARRAY['timestamp', 'event_details']),
  ('scan_complete', 'KnowYOU Admin', '🔍 Scan de Segurança Concluído', 'Scan finalizado: {event_details}', '🔍 Scan Completo\n\n{event_details}\n\nConcluído em: {timestamp}', ARRAY['timestamp', 'event_details'])
ON CONFLICT (event_type) DO NOTHING;

-- Add last_scheduler_error and last_scheduled_scan columns to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS last_scheduled_scan TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_scheduler_error TEXT;