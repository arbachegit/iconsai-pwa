-- =============================================
-- PART 1: ECONOMIC INDICATORS MODULE SCHEMA
-- =============================================

-- 1. System API Registry (Central configuration for external APIs)
CREATE TABLE public.system_api_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'BCB' CHECK (provider IN ('BCB', 'IBGE', 'Internal', 'Scraper')),
  base_url TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Economic Indicators Metadata
CREATE TABLE public.economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  api_id UUID REFERENCES public.system_api_registry(id) ON DELETE SET NULL,
  frequency TEXT DEFAULT 'monthly' CHECK (frequency IN ('daily', 'monthly', 'quarterly', 'annual')),
  unit TEXT,
  cron_schedule TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indicator Values (Time-Series Data)
CREATE TABLE public.indicator_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.economic_indicators(id) ON DELETE CASCADE,
  reference_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, reference_date)
);

-- 4. Market News (Balcão de Notícias)
CREATE TABLE public.market_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  sentiment_score NUMERIC CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.system_api_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;

-- System API Registry policies
CREATE POLICY "Admins can manage API registry" ON public.system_api_registry
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can read API registry" ON public.system_api_registry
  FOR SELECT USING (true);

-- Economic Indicators policies
CREATE POLICY "Admins can manage indicators" ON public.economic_indicators
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can read indicators" ON public.economic_indicators
  FOR SELECT USING (true);

-- Indicator Values policies
CREATE POLICY "Admins can manage indicator values" ON public.indicator_values
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert indicator values" ON public.indicator_values
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Everyone can read indicator values" ON public.indicator_values
  FOR SELECT USING (true);

-- Market News policies
CREATE POLICY "Admins can manage market news" ON public.market_news
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert market news" ON public.market_news
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Everyone can read market news" ON public.market_news
  FOR SELECT USING (true);

-- =============================================
-- PRE-POPULATE API REGISTRY WITH BCB/IBGE ENDPOINTS
-- =============================================

INSERT INTO public.system_api_registry (name, provider, base_url, description, status) VALUES
  ('Selic', 'BCB', 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json', 'Taxa Selic - Meta definida pelo COPOM', 'active'),
  ('Dólar PTAX', 'BCB', 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json', 'Taxa de câmbio - Dólar comercial (venda)', 'active'),
  ('CDI', 'BCB', 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json', 'Taxa CDI - Certificado de Depósito Interbancário', 'active'),
  ('IPCA', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/-120/variaveis/63?localidades=N1[all]', 'Índice Nacional de Preços ao Consumidor Amplo', 'active'),
  ('PIB', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/1620/periodos/-40/variaveis/583?localidades=N1[all]', 'Produto Interno Bruto - Variação trimestral', 'active'),
  ('PMC Varejo', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/8880/periodos/-24/variaveis/11709?localidades=N1[all]', 'Pesquisa Mensal do Comércio - Varejo restrito', 'active');

-- Link indicators to APIs
INSERT INTO public.economic_indicators (name, code, api_id, frequency, unit, cron_schedule) 
SELECT 'Taxa Selic', 'SELIC', id, 'monthly', '%', '0 8 * * 1' FROM public.system_api_registry WHERE name = 'Selic';

INSERT INTO public.economic_indicators (name, code, api_id, frequency, unit, cron_schedule)
SELECT 'Dólar PTAX', 'DOLAR', id, 'daily', 'R$', '0 18 * * 1-5' FROM public.system_api_registry WHERE name = 'Dólar PTAX';

INSERT INTO public.economic_indicators (name, code, api_id, frequency, unit, cron_schedule)
SELECT 'Taxa CDI', 'CDI', id, 'daily', '%', '0 8 * * 1' FROM public.system_api_registry WHERE name = 'CDI';

INSERT INTO public.economic_indicators (name, code, api_id, frequency, unit, cron_schedule)
SELECT 'IPCA', 'IPCA', id, 'monthly', '%', '0 9 10 * *' FROM public.system_api_registry WHERE name = 'IPCA';

INSERT INTO public.economic_indicators (name, code, api_id, frequency, unit, cron_schedule)
SELECT 'PIB', 'PIB', id, 'quarterly', '%', '0 9 1 * *' FROM public.system_api_registry WHERE name = 'PIB';

INSERT INTO public.economic_indicators (name, code, api_id, frequency, unit, cron_schedule)
SELECT 'PMC Varejo', 'PMC', id, 'monthly', '%', '0 9 15 * *' FROM public.system_api_registry WHERE name = 'PMC Varejo';

-- =============================================
-- NOTIFICATION EVENT TYPE
-- =============================================

INSERT INTO public.notification_preferences (event_type, event_label, email_enabled, whatsapp_enabled)
VALUES ('new_economic_data', 'Novos Dados Econômicos', true, false)
ON CONFLICT (event_type) DO NOTHING;

INSERT INTO public.notification_templates (event_type, platform_name, email_subject, email_body, whatsapp_message, variables_available)
VALUES (
  'new_economic_data',
  'KnowYOU Health',
  '📊 Novo Indicador Econômico: {indicator_name}',
  '<h2>Novo dado econômico disponível</h2><p>Indicador: <strong>{indicator_name}</strong></p><p>Valor: <strong>{value} {unit}</strong></p><p>Data de referência: {reference_date}</p><p>Atualizado em: {timestamp}</p>',
  '📊 Novo indicador: {indicator_name} - {value} {unit} (Ref: {reference_date})',
  ARRAY['indicator_name', 'value', 'unit', 'reference_date', 'timestamp']
)
ON CONFLICT (event_type) DO NOTHING;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_api_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER update_system_api_registry_updated_at
  BEFORE UPDATE ON public.system_api_registry
  FOR EACH ROW EXECUTE FUNCTION update_api_registry_updated_at();

CREATE TRIGGER update_economic_indicators_updated_at
  BEFORE UPDATE ON public.economic_indicators
  FOR EACH ROW EXECUTE FUNCTION update_api_registry_updated_at();