-- Create table for reply templates
CREATE TABLE public.reply_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  variables_used TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.reply_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage reply templates" 
ON public.reply_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_reply_templates_updated_at
BEFORE UPDATE ON public.reply_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_generated_images_updated_at();

-- Insert default templates
INSERT INTO public.reply_templates (name, subject, content, variables_used, display_order) VALUES
('Agradecimento', 'Obrigado pelo seu contato, {{nome}}!', E'Olá {{nome}},\n\nAgradecemos pelo seu contato! Recebemos sua mensagem sobre "{{assunto}}" e estamos analisando.\n\nRetornaremos em breve para {{email}} com mais informações.\n\nAtenciosamente,\nEquipe KnowRISK', ARRAY['nome', 'email', 'assunto'], 1),
('Informações adicionais', 'Re: {{assunto}}', E'Olá {{nome}},\n\nObrigado por entrar em contato conosco!\n\nPara melhor atendê-lo(a), precisamos de algumas informações adicionais:\n- [Informação 1]\n- [Informação 2]\n\nAguardamos seu retorno em {{email}}.\n\nAtenciosamente,\nEquipe KnowRISK', ARRAY['nome', 'email', 'assunto'], 2),
('Agendamento', 'Agendamento de demonstração - {{assunto}}', E'Olá {{nome}},\n\nFicamos felizes com seu interesse no KnowYOU!\n\nGostaríamos de agendar uma demonstração personalizada. Por favor, indique sua disponibilidade para uma reunião online.\n\nHorários sugeridos:\n- Segunda a sexta, das 9h às 18h\n\nEnviaremos a confirmação para {{email}}.\n\nAtenciosamente,\nEquipe KnowRISK', ARRAY['nome', 'email', 'assunto'], 3),
('Suporte técnico', 'Re: {{assunto}} - Suporte Técnico', E'Olá {{nome}},\n\nAgradecemos por reportar esta questão.\n\nNossa equipe técnica já está analisando o problema descrito em "{{assunto}}" e retornará com uma solução em breve.\n\nCaso precise de assistência imediata, por favor entre em contato através de nossos canais de suporte.\n\nAtenciosamente,\nEquipe de Suporte KnowRISK', ARRAY['nome', 'assunto'], 4),
('Parceria comercial', 'Re: {{assunto}} - Proposta de Parceria', E'Olá {{nome}},\n\nObrigado pelo interesse em estabelecer uma parceria com a KnowRISK!\n\nAnalisamos sua proposta com atenção. Para dar continuidade, gostaríamos de agendar uma reunião para discutir os detalhes.\n\nPor favor, indique sua disponibilidade. Enviaremos a confirmação para {{email}}.\n\nAtenciosamente,\nEquipe Comercial KnowRISK', ARRAY['nome', 'email', 'assunto'], 5);