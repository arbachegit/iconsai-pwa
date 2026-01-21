-- Tabela de lookup para estados brasileiros
CREATE TABLE IF NOT EXISTS public.brazilian_ufs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uf_code INTEGER NOT NULL UNIQUE,
  uf_sigla VARCHAR(2) NOT NULL UNIQUE,
  uf_name TEXT NOT NULL,
  region_code VARCHAR(2) NOT NULL,
  region_name TEXT NOT NULL,
  capital TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir todos os 27 estados + DF
INSERT INTO public.brazilian_ufs (uf_code, uf_sigla, uf_name, region_code, region_name, capital) VALUES
(11, 'RO', 'Rondônia', 'N', 'Norte', 'Porto Velho'),
(12, 'AC', 'Acre', 'N', 'Norte', 'Rio Branco'),
(13, 'AM', 'Amazonas', 'N', 'Norte', 'Manaus'),
(14, 'RR', 'Roraima', 'N', 'Norte', 'Boa Vista'),
(15, 'PA', 'Pará', 'N', 'Norte', 'Belém'),
(16, 'AP', 'Amapá', 'N', 'Norte', 'Macapá'),
(17, 'TO', 'Tocantins', 'N', 'Norte', 'Palmas'),
(21, 'MA', 'Maranhão', 'NE', 'Nordeste', 'São Luís'),
(22, 'PI', 'Piauí', 'NE', 'Nordeste', 'Teresina'),
(23, 'CE', 'Ceará', 'NE', 'Nordeste', 'Fortaleza'),
(24, 'RN', 'Rio Grande do Norte', 'NE', 'Nordeste', 'Natal'),
(25, 'PB', 'Paraíba', 'NE', 'Nordeste', 'João Pessoa'),
(26, 'PE', 'Pernambuco', 'NE', 'Nordeste', 'Recife'),
(27, 'AL', 'Alagoas', 'NE', 'Nordeste', 'Maceió'),
(28, 'SE', 'Sergipe', 'NE', 'Nordeste', 'Aracaju'),
(29, 'BA', 'Bahia', 'NE', 'Nordeste', 'Salvador'),
(31, 'MG', 'Minas Gerais', 'SE', 'Sudeste', 'Belo Horizonte'),
(32, 'ES', 'Espírito Santo', 'SE', 'Sudeste', 'Vitória'),
(33, 'RJ', 'Rio de Janeiro', 'SE', 'Sudeste', 'Rio de Janeiro'),
(35, 'SP', 'São Paulo', 'SE', 'Sudeste', 'São Paulo'),
(41, 'PR', 'Paraná', 'S', 'Sul', 'Curitiba'),
(42, 'SC', 'Santa Catarina', 'S', 'Sul', 'Florianópolis'),
(43, 'RS', 'Rio Grande do Sul', 'S', 'Sul', 'Porto Alegre'),
(50, 'MS', 'Mato Grosso do Sul', 'CO', 'Centro-Oeste', 'Campo Grande'),
(51, 'MT', 'Mato Grosso', 'CO', 'Centro-Oeste', 'Cuiabá'),
(52, 'GO', 'Goiás', 'CO', 'Centro-Oeste', 'Goiânia'),
(53, 'DF', 'Distrito Federal', 'CO', 'Centro-Oeste', 'Brasília');

-- Tabela para armazenar valores de indicadores por UF
CREATE TABLE IF NOT EXISTS public.indicator_regional_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.economic_indicators(id) ON DELETE CASCADE,
  uf_code INTEGER NOT NULL REFERENCES public.brazilian_ufs(uf_code),
  reference_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(indicator_id, uf_code, reference_date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_indicator_regional_values_indicator ON public.indicator_regional_values(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_regional_values_uf ON public.indicator_regional_values(uf_code);
CREATE INDEX IF NOT EXISTS idx_indicator_regional_values_date ON public.indicator_regional_values(reference_date);

-- Enable RLS
ALTER TABLE public.brazilian_ufs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_regional_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brazilian_ufs (public read)
CREATE POLICY "Everyone can read brazilian_ufs" ON public.brazilian_ufs FOR SELECT USING (true);
CREATE POLICY "Admins can manage brazilian_ufs" ON public.brazilian_ufs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for indicator_regional_values
CREATE POLICY "Everyone can read indicator_regional_values" ON public.indicator_regional_values FOR SELECT USING (true);
CREATE POLICY "Admins can manage indicator_regional_values" ON public.indicator_regional_values FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "System can insert indicator_regional_values" ON public.indicator_regional_values FOR INSERT WITH CHECK (true);

-- Adicionar coluna is_regional aos indicadores para identificar indicadores com dados por UF
ALTER TABLE public.economic_indicators ADD COLUMN IF NOT EXISTS is_regional BOOLEAN DEFAULT false;