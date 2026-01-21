-- Part 2: Create user_registrations table
CREATE TABLE IF NOT EXISTS public.user_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  
  -- Organizational Context
  dns_origin TEXT,
  institution_work TEXT,
  institution_study TEXT,
  
  -- Role & Status
  role app_role NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  mass_import_at TIMESTAMPTZ,
  
  -- Tracking
  approved_by UUID,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_registrations_status ON public.user_registrations(status);
CREATE INDEX IF NOT EXISTS idx_user_registrations_email ON public.user_registrations(email);
CREATE INDEX IF NOT EXISTS idx_user_registrations_dns_origin ON public.user_registrations(dns_origin);
CREATE INDEX IF NOT EXISTS idx_user_registrations_requested_at ON public.user_registrations(requested_at DESC);

-- Enable RLS
ALTER TABLE public.user_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage user registrations"
ON public.user_registrations
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "System can insert user registrations"
ON public.user_registrations
FOR INSERT
WITH CHECK (true);

-- Trigger function to extract DNS from email
CREATE OR REPLACE FUNCTION public.extract_dns_from_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
    NEW.dns_origin := SUBSTRING(NEW.email FROM '@(.*)$');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trg_extract_dns_before_insert ON public.user_registrations;
CREATE TRIGGER trg_extract_dns_before_insert
BEFORE INSERT OR UPDATE ON public.user_registrations
FOR EACH ROW
EXECUTE FUNCTION public.extract_dns_from_email();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_user_registrations_timestamp ON public.user_registrations;
CREATE TRIGGER update_user_registrations_timestamp
BEFORE UPDATE ON public.user_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_user_registrations_updated_at();

-- Part 3: Add new notification event types to notification_preferences
INSERT INTO notification_preferences (event_type, event_label, email_enabled, whatsapp_enabled)
VALUES 
  ('user_registration_request', 'Solicitação de Cadastro', true, false),
  ('user_registration_approved', 'Aprovação de Cadastro (Boas-vindas)', true, false),
  ('user_registration_rejected', 'Reprovação de Cadastro', true, false)
ON CONFLICT (event_type) DO NOTHING;

-- Part 4: Add notification templates
INSERT INTO notification_templates (event_type, platform_name, email_subject, email_body, whatsapp_message, variables_available)
VALUES 
  (
    'user_registration_request',
    'Plataforma KnowYOU Health',
    '📝 Nova Solicitação de Cadastro - {user_name}',
    'Nova solicitação de cadastro recebida.

Nome: {user_name}
Email: {user_email}
DNS Origin: {dns_origin}
Instituição de Trabalho: {institution_work}
Instituição de Estudo: {institution_study}

Acesse o painel administrativo para aprovar ou reprovar esta solicitação.',
    '{timestamp} - Nova solicitação de cadastro: {user_name} ({user_email}). Acesse o painel para revisar.',
    ARRAY['user_name', 'user_email', 'dns_origin', 'institution_work', 'institution_study', 'timestamp', 'platform_name']
  ),
  (
    'user_registration_approved',
    'Plataforma KnowYOU Health',
    '✅ Bem-vindo à Plataforma KnowYOU Health!',
    'Olá, {user_name}!

Seu cadastro foi aprovado! 🎉

Para completar seu acesso, defina sua senha clicando no link abaixo:

{recovery_link}

Este link é válido por 24 horas.

Bem-vindo à Plataforma KnowYOU Health!

Atenciosamente,
Equipe KnowYOU',
    '✅ {timestamp} - Plataforma KnowYOU Health: Bem-vindo {user_name}! Seu cadastro foi aprovado. Defina sua senha: {recovery_link}',
    ARRAY['user_name', 'user_email', 'recovery_link', 'timestamp', 'platform_name']
  ),
  (
    'user_registration_rejected',
    'Plataforma KnowYOU Health',
    '❌ Solicitação de Cadastro Reprovada',
    'Olá, {user_name}.

Sua solicitação de cadastro na Plataforma KnowYOU Health foi reprovada.

Motivo: {rejection_reason}

Para mais informações, entre em contato com nosso suporte.

Atenciosamente,
Equipe KnowYOU',
    '❌ {timestamp} - Plataforma KnowYOU Health: Sua solicitação de cadastro foi reprovada. Motivo: {rejection_reason}',
    ARRAY['user_name', 'user_email', 'rejection_reason', 'timestamp', 'platform_name']
  )
ON CONFLICT (event_type) DO NOTHING;