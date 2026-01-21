-- Create maieutic_training_categories table
CREATE TABLE public.maieutic_training_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  category_icon TEXT DEFAULT 'Brain',
  positive_directives TEXT DEFAULT '',
  antiprompt TEXT DEFAULT '',
  combination_rules JSONB DEFAULT '[]'::jsonb,
  behavioral_instructions TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maieutic_training_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage maieutic training"
ON public.maieutic_training_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can read maieutic training"
ON public.maieutic_training_categories
FOR SELECT
USING (true);

-- Insert the 5 categories with default values
INSERT INTO public.maieutic_training_categories (category_key, category_name, category_icon, display_order, combination_rules, behavioral_instructions) VALUES
('math', 'Matemática (Logic & Visualization)', 'Calculator', 1, '["regional", "high_superficial", "medium_superficial", "deterministic"]'::jsonb, 'Se usuário solicita comparar múltiplas variáveis, NÃO agrupe em um único gráfico. Gere sub-plots ou visualização facetada. Enriqueça detalhes técnicos, não simplifique a menos que solicitado.'),
('regional', 'Possível origem regional da pessoa', 'Globe', 2, '["math", "high_superficial", "medium_superficial", "deterministic"]'::jsonb, 'Detecte idiomas, gírias ou sintaxe específica de região. Espelhe levemente a estrutura semântica do usuário para criar rapport, mantendo profissionalismo.'),
('high_superficial', 'Pergunta com alta superficialidade', 'HelpCircle', 3, '["math", "regional"]'::jsonb, 'Usuário está vago. NUNCA adivinhe. Use o método Socrático: faça perguntas guiadas para aprofundar a intenção antes de responder.'),
('medium_superficial', 'Pergunta com média superficialidade', 'Search', 4, '["math", "regional"]'::jsonb, 'Usuário está razoavelmente claro mas faltam detalhes. Guie-o para os parâmetros específicos necessários antes de responder completamente.'),
('deterministic', 'Pergunta determinística', 'Target', 5, '["math", "regional"]'::jsonb, 'Usuário é pragmático e direto. Seja direto, curto e objetivo na resposta. Não faça perguntas desnecessárias.');

-- Create trigger for updated_at
CREATE TRIGGER update_maieutic_training_updated_at
BEFORE UPDATE ON public.maieutic_training_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_generated_images_updated_at();