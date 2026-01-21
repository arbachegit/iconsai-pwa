-- Create security alert configuration table
CREATE TABLE public.security_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_level TEXT NOT NULL DEFAULT 'secure' CHECK (current_level IN ('critical', 'warning', 'secure')),
  template_critical TEXT NOT NULL DEFAULT '🔴 CRÍTICO: Vulnerabilidade de segurança detectada. Exposição de dados sensíveis identificada. Ação imediata necessária.',
  template_warning TEXT NOT NULL DEFAULT '🟡 ATENÇÃO: Problema de segurança identificado. Funções depreciadas ou configurações que requerem revisão.',
  template_secure TEXT NOT NULL DEFAULT '🟢 SEGURO: Sistema estável e protegido. Nenhuma vulnerabilidade detectada.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_alert_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage security alert config"
ON public.security_alert_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.security_alert_config (current_level) VALUES ('secure');

-- Create updated_at trigger
CREATE TRIGGER update_security_alert_config_updated_at
BEFORE UPDATE ON public.security_alert_config
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_preferences_updated_at();