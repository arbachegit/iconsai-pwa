-- Criar tabela section_contents para armazenar conteúdo das seções da landing page
CREATE TABLE public.section_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id TEXT NOT NULL UNIQUE,
  header TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.section_contents ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler section_contents
CREATE POLICY "Everyone can read section_contents"
ON public.section_contents FOR SELECT
USING (true);

-- Policy: Apenas admins podem gerenciar section_contents
CREATE POLICY "Admins can manage section_contents"
ON public.section_contents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir dados iniciais para as 8 seções principais
INSERT INTO public.section_contents (section_id, header, title, content) VALUES
  ('software', '', 'A Era do Software', ''),
  ('internet', '', 'A Revolução da Internet', ''),
  ('tech-sem-proposito', '', 'Tecnologias Sem Propósito', ''),
  ('kubrick', '', 'A Visão de Kubrick', ''),
  ('watson', '', 'IBM Watson', ''),
  ('ia-nova-era', '', 'A Nova Era da IA', ''),
  ('bom-prompt', '', 'A Arte do Bom Prompt', ''),
  ('knowyou', '', 'KnowYOU', '');