-- Create notification_logic_config table to store per-event logic settings
CREATE TABLE IF NOT EXISTS public.notification_logic_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logic_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage notification logic config"
ON public.notification_logic_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default configs for the three events
INSERT INTO public.notification_logic_config (event_type, config) VALUES
('login_alert', '{"checkIp": true, "checkDevice": true, "checkGeo": false, "alertOnNewDevice": true}'),
('password_reset', '{"codeLength": 6, "expirationMinutes": 15, "maxAttempts": 3}'),
('security_alert', '{"cronEnabled": true, "cronExpression": "0 3 * * *", "alertThreshold": "warning"}')
ON CONFLICT (event_type) DO NOTHING;

-- Update password_reset template to include numero_aleatorio variable
UPDATE public.notification_templates 
SET 
  variables_available = ARRAY['timestamp', 'event_details', 'numero_aleatorio', 'platform_name'],
  email_subject = COALESCE(email_subject, '🔑 Código de Recuperação de Senha'),
  email_body = COALESCE(email_body, 'Seu código de recuperação é: {numero_aleatorio}

Solicitado por: {event_details}
Horário: {timestamp}

Este código expira em 15 minutos.'),
  whatsapp_message = COALESCE(whatsapp_message, '🔑 Recuperação de Senha

Código: {numero_aleatorio}
Usuário: {event_details}
Horário: {timestamp}

⏱️ Expira em 15 minutos.')
WHERE event_type = 'password_reset';

-- Update login_alert template with device info variable
UPDATE public.notification_templates 
SET 
  variables_available = ARRAY['timestamp', 'event_details', 'platform_name', 'device_info', 'ip_address'],
  email_body = COALESCE(email_body, 'Alerta: Login suspeito detectado via {event_details}.

Se não foi você, bloqueie sua conta imediatamente.

Horário: {timestamp}'),
  whatsapp_message = COALESCE(whatsapp_message, '🚨 Alerta de Login Suspeito

Dispositivo: {event_details}
Horário: {timestamp}

Se não foi você, bloqueie sua conta.')
WHERE event_type = 'login_alert';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_notification_logic_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_notification_logic_config_updated_at
BEFORE UPDATE ON public.notification_logic_config
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_logic_config_updated_at();