-- User Invitations table for admin-created invites
CREATE TABLE public.user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'user',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Status do convite
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'form_submitted', 'completed', 'expired', 'cancelled')),
    
    -- Dados do formulário (preenchidos pelo usuário)
    phone TEXT,
    address_cep TEXT,
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_neighborhood TEXT,
    address_city TEXT,
    address_state TEXT,
    
    -- Verificação 2FA
    verification_code TEXT,
    verification_method TEXT CHECK (verification_method IN ('email', 'whatsapp')),
    verification_attempts INTEGER DEFAULT 0,
    verification_code_expires_at TIMESTAMPTZ,
    
    -- Rate limiting para reenvio
    resend_count INTEGER DEFAULT 0,
    last_resend_at TIMESTAMPTZ,
    
    -- Metadados de envio
    send_via_email BOOLEAN DEFAULT true,
    send_via_whatsapp BOOLEAN DEFAULT false,
    
    -- Timestamps
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invitations
CREATE POLICY "Admins can manage invitations"
ON public.user_invitations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

-- Anyone can read invitation by token (for public invite page)
CREATE POLICY "Anyone can read invitation by token"
ON public.user_invitations FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public insert/update for form submission (controlled by edge functions)
CREATE POLICY "Public can update invitation form data"
ON public.user_invitations FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Indices for performance
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_user_invitations_expires_at ON public.user_invitations(expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON public.user_invitations
    FOR EACH ROW EXECUTE FUNCTION public.update_user_registrations_updated_at();