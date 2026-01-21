-- ============================================
-- KnowYOU Security v3 - Audit & Whitelist Tables
-- ============================================

-- 1. Criar tabela security_whitelist (IPs de administradores)
CREATE TABLE public.security_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    user_email TEXT,
    user_name TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por IP
CREATE INDEX idx_security_whitelist_ip ON public.security_whitelist(ip_address);
CREATE INDEX idx_security_whitelist_active ON public.security_whitelist(is_active) WHERE is_active = true;

-- 2. Criar tabela security_audit_log (logs detalhados de violações)
CREATE TABLE public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'critical',
    device_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    user_email TEXT,
    user_id UUID,
    
    -- Dados do Dispositivo (v3)
    browser_name TEXT,
    browser_version TEXT,
    os_name TEXT,
    os_version TEXT,
    screen_resolution TEXT,
    canvas_fingerprint TEXT,
    webgl_fingerprint TEXT,
    hardware_concurrency INTEGER,
    device_memory INTEGER,
    timezone TEXT,
    language TEXT,
    platform TEXT,
    
    -- Geolocalização (v3)
    geo_country TEXT,
    geo_region TEXT,
    geo_city TEXT,
    geo_lat NUMERIC,
    geo_lon NUMERIC,
    geo_isp TEXT,
    geo_org TEXT,
    geo_timezone TEXT,
    
    -- Ação e Resultado
    action_taken TEXT DEFAULT 'banned',
    was_whitelisted BOOLEAN DEFAULT false,
    ban_applied BOOLEAN DEFAULT false,
    
    -- Notificações
    email_sent BOOLEAN DEFAULT false,
    whatsapp_sent BOOLEAN DEFAULT false,
    email_sent_to TEXT,
    whatsapp_sent_to TEXT,
    
    -- Contexto
    page_url TEXT,
    violation_details JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas do dashboard
CREATE INDEX idx_security_audit_log_occurred ON public.security_audit_log(occurred_at DESC);
CREATE INDEX idx_security_audit_log_type ON public.security_audit_log(incident_type);
CREATE INDEX idx_security_audit_log_ip ON public.security_audit_log(ip_address);
CREATE INDEX idx_security_audit_log_city ON public.security_audit_log(geo_city);
CREATE INDEX idx_security_audit_log_country ON public.security_audit_log(geo_country);
CREATE INDEX idx_security_audit_log_whitelisted ON public.security_audit_log(was_whitelisted);
CREATE INDEX idx_security_audit_log_ban ON public.security_audit_log(ban_applied);

-- 3. RLS Policies para security_whitelist
ALTER TABLE public.security_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security whitelist" 
ON public.security_whitelist 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can read security whitelist" 
ON public.security_whitelist 
FOR SELECT 
USING (true);

-- 4. RLS Policies para security_audit_log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read security audit log" 
ON public.security_audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert security audit log" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- 5. Trigger para updated_at em security_whitelist
CREATE OR REPLACE FUNCTION update_security_whitelist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_security_whitelist_updated_at
    BEFORE UPDATE ON public.security_whitelist
    FOR EACH ROW
    EXECUTE FUNCTION update_security_whitelist_updated_at();