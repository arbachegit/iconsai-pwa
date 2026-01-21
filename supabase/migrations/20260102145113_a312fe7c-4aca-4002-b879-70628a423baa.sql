-- ============================================
-- Phase 1: Create presentation_scripts and crm_visits tables
-- ============================================

-- 1.1 Create presentation_scripts table
CREATE TABLE public.presentation_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  audio_script TEXT NOT NULL,
  icon TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.presentation_scripts ENABLE ROW LEVEL SECURITY;

-- RLS: Public can read active scripts
CREATE POLICY "Public can read active presentation scripts"
ON public.presentation_scripts FOR SELECT
USING (is_active = true);

-- RLS: Admins can manage all scripts
CREATE POLICY "Admins can manage presentation scripts"
ON public.presentation_scripts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- 1.2 Create crm_visits table
CREATE TABLE public.crm_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id UUID REFERENCES auth.users(id),
  presentation_topic TEXT NOT NULL,
  lead_name TEXT NOT NULL,
  lead_email TEXT,
  lead_phone TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'converted', 'lost')),
  duration_seconds INTEGER DEFAULT 0,
  summary TEXT,
  summary_sent_email BOOLEAN DEFAULT false,
  summary_sent_whatsapp BOOLEAN DEFAULT false,
  session_id TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_visits ENABLE ROW LEVEL SECURITY;

-- RLS: Public can insert visits (for lead capture)
CREATE POLICY "Public can insert crm visits"
ON public.crm_visits FOR INSERT
WITH CHECK (true);

-- RLS: Salesmen can read their own visits
CREATE POLICY "Salesmen can read own visits"
ON public.crm_visits FOR SELECT
USING (
  salesman_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- RLS: Salesmen can update their own visits
CREATE POLICY "Salesmen can update own visits"
ON public.crm_visits FOR UPDATE
USING (
  salesman_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- RLS: Admins can delete visits
CREATE POLICY "Admins can delete crm visits"
ON public.crm_visits FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_crm_visits_salesman_id ON public.crm_visits(salesman_id);
CREATE INDEX idx_crm_visits_created_at ON public.crm_visits(created_at DESC);
CREATE INDEX idx_crm_visits_topic ON public.crm_visits(presentation_topic);
CREATE INDEX idx_crm_visits_status ON public.crm_visits(status);

-- 1.3 Insert initial presentation scripts
INSERT INTO public.presentation_scripts (topic, title, description, audio_script, icon, duration_seconds) VALUES
('architecture', 'Architecture - Estrutura Inteligente', 'Sistema de arquitetura de dados e integração', 
'Bem-vindo ao módulo Architecture do KnowYOU! Aqui você vai descobrir como estruturamos dados de múltiplas fontes governamentais em uma arquitetura robusta e escalável. Nossa plataforma integra informações do IBGE, IPEA, Banco Central e muito mais, transformando dados brutos em conhecimento acionável. Com nossa arquitetura de microsserviços e processamento em tempo real, garantimos que você sempre tenha acesso às informações mais atualizadas para tomar decisões estratégicas.', 
'Building2', 45),

('govsystem', 'GovSystem AI - Inteligência Governamental', 'Sistema de análise de dados governamentais com IA',
'Conheça o GovSystem AI, nosso motor de inteligência artificial especializado em dados governamentais brasileiros! Utilizamos modelos de linguagem avançados treinados especificamente para entender o contexto brasileiro, incluindo legislação, indicadores econômicos e políticas públicas. Nossa IA consegue correlacionar dados de diferentes esferas governamentais, identificando padrões e gerando insights que seriam impossíveis de detectar manualmente.',
'Landmark', 50),

('retail', 'Retail System - Varejo Inteligente', 'Sistema de análise para o setor varejista',
'O Retail System foi desenvolvido para revolucionar a forma como o varejo brasileiro toma decisões! Integramos dados de consumo, indicadores econômicos regionais e tendências de mercado para fornecer previsões precisas de demanda. Com nossa análise preditiva, você pode antecipar comportamentos de compra, otimizar estoques e identificar oportunidades de expansão em diferentes regiões do país.',
'ShoppingCart', 40),

('autocontrol', 'AutoControl - Automação e Controle', 'Sistema de automação de processos e controle',
'Apresentamos o AutoControl, sua central de automação inteligente! Este módulo permite configurar gatilhos automáticos baseados em indicadores econômicos e eventos de mercado. Defina alertas personalizados, automatize relatórios e mantenha sua equipe sempre informada sobre mudanças críticas. Nossa engine de regras processa milhões de dados por segundo, garantindo que você nunca perca uma oportunidade.',
'Settings2', 35),

('tutor', 'Tutor - Aprendizado Guiado', 'Sistema de capacitação e treinamento interativo',
'Bem-vindo ao Tutor KnowYOU, seu assistente de aprendizado personalizado! Desenvolvemos um sistema adaptativo que entende seu nível de conhecimento e adapta o conteúdo para máxima absorção. Aprenda sobre indicadores econômicos, análise de dados governamentais e tomada de decisão estratégica no seu próprio ritmo. Com exercícios práticos e feedback em tempo real, você estará dominando a plataforma em pouco tempo.',
'GraduationCap', 55),

('healthcare', 'HealthCare - Saúde Pública', 'Sistema de análise de dados de saúde pública',
'O módulo HealthCare é dedicado à análise profunda do sistema de saúde brasileiro. Integramos dados do DATASUS, vigilância epidemiológica e indicadores de saúde municipais para fornecer uma visão completa do cenário de saúde pública. Gestores podem monitorar surtos, avaliar capacidade hospitalar e planejar recursos com base em projeções precisas. Juntos, construímos um Brasil mais saudável.',
'Heart', 48),

('talkapp', 'Talk APP - Comunicação Inteligente', 'Sistema de chat e comunicação com IA',
'Descubra o Talk APP, nossa interface conversacional de última geração! Converse naturalmente com nossa IA e obtenha respostas instantâneas sobre qualquer dado da plataforma. Faça perguntas complexas em português brasileiro e receba análises detalhadas em segundos. O Talk APP entende contexto, lembra de conversas anteriores e aprende com suas preferências para oferecer uma experiência cada vez mais personalizada.',
'MessageSquare', 42);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_presentation_scripts_updated_at
BEFORE UPDATE ON public.presentation_scripts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_visits_updated_at
BEFORE UPDATE ON public.crm_visits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();