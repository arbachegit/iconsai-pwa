-- =============================================================
-- SISTEMA DE TAXONOMIA GLOBAL
-- Tabelas: global_taxonomy, entity_tags, agent_tag_profiles
-- =============================================================

-- 1. TABELA PRINCIPAL: global_taxonomy (hierarquia de tags/categorias)
CREATE TABLE public.global_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.global_taxonomy(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  synonyms TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  icon TEXT,
  color TEXT,
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'deprecated')),
  auto_created BOOLEAN DEFAULT false,
  created_by UUID,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_taxonomy_code ON public.global_taxonomy(code);
CREATE INDEX idx_taxonomy_parent ON public.global_taxonomy(parent_id);
CREATE INDEX idx_taxonomy_status ON public.global_taxonomy(status);
CREATE INDEX idx_taxonomy_keywords ON public.global_taxonomy USING GIN(keywords);
CREATE INDEX idx_taxonomy_synonyms ON public.global_taxonomy USING GIN(synonyms);

-- 2. TABELA DE ASSOCIAÇÃO: entity_tags (liga entidades à taxonomia)
CREATE TABLE public.entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('document', 'indicator', 'data_source', 'chunk')),
  entity_id UUID NOT NULL,
  taxonomy_id UUID NOT NULL REFERENCES public.global_taxonomy(id) ON DELETE CASCADE,
  confidence FLOAT DEFAULT 1.0,
  source TEXT NOT NULL CHECK (source IN ('manual', 'ai_auto', 'ai_suggested', 'inherited')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, taxonomy_id)
);

CREATE INDEX idx_entity_tags_entity ON public.entity_tags(entity_type, entity_id);
CREATE INDEX idx_entity_tags_taxonomy ON public.entity_tags(taxonomy_id);

-- 3. TABELA DE PERFIS: agent_tag_profiles (quais tags cada agente usa)
CREATE TABLE public.agent_tag_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.chat_agents(id) ON DELETE CASCADE,
  taxonomy_id UUID NOT NULL REFERENCES public.global_taxonomy(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('include', 'exclude', 'prefer')),
  include_children BOOLEAN DEFAULT true,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, taxonomy_id)
);

CREATE INDEX idx_agent_profiles_agent ON public.agent_tag_profiles(agent_id);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE public.global_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tag_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública
CREATE POLICY "Public can read global_taxonomy"
  ON public.global_taxonomy FOR SELECT USING (true);

CREATE POLICY "Public can read entity_tags"
  ON public.entity_tags FOR SELECT USING (true);

CREATE POLICY "Public can read agent_tag_profiles"
  ON public.agent_tag_profiles FOR SELECT USING (true);

-- Políticas de escrita (apenas admins)
CREATE POLICY "Admins can manage global_taxonomy"
  ON public.global_taxonomy FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can manage entity_tags"
  ON public.entity_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can manage agent_tag_profiles"
  ON public.agent_tag_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Políticas para sistema inserir (edge functions)
CREATE POLICY "System can insert entity_tags"
  ON public.entity_tags FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert global_taxonomy"
  ON public.global_taxonomy FOR INSERT WITH CHECK (true);

-- =============================================================
-- TRIGGER PARA UPDATED_AT
-- =============================================================

CREATE OR REPLACE FUNCTION public.update_taxonomy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER trigger_update_taxonomy_timestamp
  BEFORE UPDATE ON public.global_taxonomy
  FOR EACH ROW EXECUTE FUNCTION public.update_taxonomy_updated_at();