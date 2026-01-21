-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create pwa_config table for PWA configuration settings
CREATE TABLE public.pwa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value text,
  config_type text DEFAULT 'text' CHECK (config_type IN ('text', 'number', 'boolean', 'json')),
  description text,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pwa_config ENABLE ROW LEVEL SECURITY;

-- Public can read configs (needed for PWA to load)
CREATE POLICY "Public can read pwa_config"
ON public.pwa_config
FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update pwa_config"
ON public.pwa_config
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Only admins can insert
CREATE POLICY "Admins can insert pwa_config"
ON public.pwa_config
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Only superadmins can delete
CREATE POLICY "Superadmins can delete pwa_config"
ON public.pwa_config
FOR DELETE
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_pwa_config_updated_at
BEFORE UPDATE ON public.pwa_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configurations
INSERT INTO public.pwa_config (config_key, config_value, config_type, description) VALUES
('welcome_text', 'Olá [name]! Bem-vindo ao KnowYOU, seu assistente de voz inteligente. Escolha um dos módulos abaixo para começarmos.', 'text', 'Texto de boas-vindas (use [name] para nome do usuário)'),
('tts_voice', 'fernando', 'text', 'Voz TTS: fernando (ElevenLabs), alloy, onyx, nova, shimmer (OpenAI)'),
('mic_timeout_seconds', '10', 'number', 'Tempo limite do microfone em segundos (5-30)'),
('enable_countdown', 'true', 'boolean', 'Mostrar contagem regressiva nos últimos 5 segundos'),
('splash_duration_ms', '3000', 'number', 'Duração do splash screen em milissegundos');