-- Adicionar campos de adaptação cognitiva e visual à tabela context_profiles
ALTER TABLE public.context_profiles
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#00D4FF',
ADD COLUMN IF NOT EXISTS adaptation_speed TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS initial_cognitive_level INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS min_cognitive_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_cognitive_level INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS auto_detect_region BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS default_region_code TEXT DEFAULT NULL;

-- Criar tabela de taxonomias por perfil (inclusão/exclusão)
CREATE TABLE IF NOT EXISTS public.profile_taxonomies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code TEXT NOT NULL,
  taxonomy_code TEXT NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('include', 'exclude')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_code, taxonomy_code)
);

-- RLS para profile_taxonomies
ALTER TABLE public.profile_taxonomies ENABLE ROW LEVEL SECURITY;

-- Policy para admins gerenciarem
CREATE POLICY "Admins can manage profile_taxonomies" ON public.profile_taxonomies
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Policy para leitura pública
CREATE POLICY "Public can read profile_taxonomies" ON public.profile_taxonomies
  FOR SELECT USING (true);