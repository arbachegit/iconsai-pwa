
-- Create table for regional tone rules
CREATE TABLE public.regional_tone_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_code TEXT NOT NULL UNIQUE,
  region_name TEXT NOT NULL,
  tone_rules TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regional_tone_rules ENABLE ROW LEVEL SECURITY;

-- Admins can manage regional rules
CREATE POLICY "Admins can manage regional tone rules"
ON public.regional_tone_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can read active rules (needed for Edge Functions)
CREATE POLICY "Everyone can read active regional rules"
ON public.regional_tone_rules
FOR SELECT
USING (is_active = true);

-- Insert default rules based on current hardcoded values
INSERT INTO public.regional_tone_rules (region_code, region_name, tone_rules) VALUES
('sudeste-sp', 'Sudeste - São Paulo', 'Tom profissional e direto. Respostas concisas e eficientes. Evite rodeios - vá direto ao ponto. Use linguagem clara e objetiva.'),
('sudeste-mg', 'Sudeste - Minas Gerais', 'Tom acolhedor e gentil. Use expressões suaves como "vamos ver isso juntos". Valorize o coletivo e a parceria. Seja caloroso mas profissional.'),
('sudeste-rj', 'Sudeste - Rio de Janeiro', 'Tom descontraído mas informativo. Use linguagem acessível e leve. Seja informal dentro dos limites profissionais. Transmita confiança e simpatia.'),
('sul', 'Sul', 'Tom formal e estruturado. Valorize dados e fatos. Seja metódico e organizado nas respostas. Respeite hierarquias e formalidades.'),
('nordeste', 'Nordeste', 'Tom caloroso e narrativo. Use storytelling quando apropriado. Valorize conexões humanas e exemplos práticos. Seja acolhedor e próximo.'),
('norte', 'Norte', 'Tom respeitoso e inclusivo. Valorize conhecimentos locais. Seja paciente e didático. Use analogias com a realidade regional quando possível.'),
('centro-oeste', 'Centro-Oeste', 'Tom equilibrado entre formal e acolhedor. Valorize praticidade e resultados. Seja direto mas cordial. Respeite o tempo do interlocutor.'),
('default', 'Padrão (Outras regiões)', 'Tom neutro e profissional. Seja claro, objetivo e respeitoso. Adapte-se conforme a conversa evolui. Mantenha cordialidade em todas as interações.');
