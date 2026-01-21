-- ============================================
-- SISTEMA DE SEGURANÇA KNOWYOU V2 - TOLERÂNCIA ZERO
-- ============================================

-- Tabela: banned_devices
-- Armazena dispositivos banidos permanentemente
CREATE TABLE IF NOT EXISTS public.banned_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    user_id UUID,
    user_email TEXT,
    ban_reason TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    is_permanent BOOLEAN DEFAULT true,
    banned_at TIMESTAMPTZ DEFAULT NOW(),
    unbanned_at TIMESTAMPTZ,
    unbanned_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_banned_devices_fingerprint ON public.banned_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_banned_devices_ip ON public.banned_devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_devices_user ON public.banned_devices(user_id);

-- Enable RLS
ALTER TABLE public.banned_devices ENABLE ROW LEVEL SECURITY;

-- Policies para banned_devices
CREATE POLICY "Public can check ban status" ON public.banned_devices
    FOR SELECT USING (true);

CREATE POLICY "System can insert banned devices" ON public.banned_devices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage banned devices" ON public.banned_devices
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Tabela: security_violations
-- Log de todas as violações de segurança
CREATE TABLE IF NOT EXISTS public.security_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint TEXT NOT NULL,
    ip_address INET,
    user_id UUID,
    user_email TEXT,
    violation_type TEXT NOT NULL,
    violation_details JSONB DEFAULT '{}',
    action_taken TEXT NOT NULL DEFAULT 'banned',
    severity TEXT DEFAULT 'critical',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para security_violations
CREATE INDEX IF NOT EXISTS idx_security_violations_type ON public.security_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_security_violations_created ON public.security_violations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_violations_fingerprint ON public.security_violations(device_fingerprint);

-- Enable RLS
ALTER TABLE public.security_violations ENABLE ROW LEVEL SECURITY;

-- Policies para security_violations
CREATE POLICY "Admins can read security violations" ON public.security_violations
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert security violations" ON public.security_violations
    FOR INSERT WITH CHECK (true);

-- Adicionar campos de banimento em user_registrations
ALTER TABLE public.user_registrations
    ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS banned_by UUID,
    ADD COLUMN IF NOT EXISTS ban_reason TEXT,
    ADD COLUMN IF NOT EXISTS ban_type TEXT,
    ADD COLUMN IF NOT EXISTS unbanned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS unbanned_by UUID;

-- Índice para busca de usuários banidos
CREATE INDEX IF NOT EXISTS idx_user_registrations_banned ON public.user_registrations(is_banned) WHERE is_banned = true;