-- Tabela de Usuários do PWA
CREATE TABLE IF NOT EXISTS public.pwa_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  access_codes TEXT[] DEFAULT ARRAY['pwa'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Convites PWA
CREATE TABLE IF NOT EXISTS public.pwa_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.pwa_users(id) ON DELETE CASCADE,
  access_code TEXT UNIQUE NOT NULL,
  channel TEXT DEFAULT 'whatsapp',
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pwa_invites_code ON public.pwa_invites(access_code);
CREATE INDEX IF NOT EXISTS idx_pwa_invites_user ON public.pwa_invites(user_id);

-- RLS
ALTER TABLE public.pwa_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_invites ENABLE ROW LEVEL SECURITY;

-- Políticas para pwa_users
CREATE POLICY "Allow anonymous read pwa_users" ON public.pwa_users FOR SELECT USING (true);
CREATE POLICY "Allow admin manage pwa_users" ON public.pwa_users FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Políticas para pwa_invites
CREATE POLICY "Allow anonymous read pwa_invites" ON public.pwa_invites FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update pwa_invites" ON public.pwa_invites FOR UPDATE USING (true);
CREATE POLICY "Allow admin manage pwa_invites" ON public.pwa_invites FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));