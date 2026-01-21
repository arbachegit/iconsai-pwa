-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  event_label TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access only
CREATE POLICY "Admins can manage notification preferences" 
ON public.notification_preferences 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Pre-populate with system event types
INSERT INTO public.notification_preferences (event_type, event_label, email_enabled, whatsapp_enabled) VALUES
  ('new_document', 'Novo Documento RAG', true, false),
  ('document_failed', 'Falha no Processamento', true, false),
  ('new_contact_message', 'Nova Mensagem de Contato', true, false),
  ('security_alert', 'Alerta de Segurança', true, false),
  ('ml_accuracy_drop', 'Queda de Precisão ML', true, false),
  ('new_conversation', 'Nova Conversa de Usuário', false, false);

-- Add whatsapp columns to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS whatsapp_target_phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_global_enabled BOOLEAN DEFAULT false;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_preferences_updated_at();