-- Add new Regional PMC APIs (by UF) for all PMC indicators
-- Each API uses n3/all to fetch data for all Brazilian states

-- 1. PMC Varejo por UF (Tabela 8880, Variável 11709)
INSERT INTO public.system_api_registry (
  name, 
  provider, 
  base_url, 
  status, 
  target_table,
  description
) VALUES (
  'IBGE PMC Varejo por UF',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/8880/n3/all/v/11709/p/all/c11046/56734',
  'active',
  'indicator_regional_values',
  'Pesquisa Mensal de Comércio - Varejo Restrito por UF'
);

INSERT INTO public.economic_indicators (code, name, category, frequency, unit, is_regional, api_id) 
SELECT 'PMC_VAREJO_UF', 'Varejo - Volume de vendas (Regional)', 'comercio', 'monthly', 'Índice base 100', true, id
FROM public.system_api_registry WHERE name = 'IBGE PMC Varejo por UF' LIMIT 1;

-- 2. PMC Combustíveis por UF (Tabela 8880, Variável 11709, Classificação Combustíveis 56735)
INSERT INTO public.system_api_registry (
  name, 
  provider, 
  base_url, 
  status, 
  target_table,
  description
) VALUES (
  'IBGE PMC Combustíveis por UF',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/8880/n3/all/v/11709/p/all/c11046/56735',
  'active',
  'indicator_regional_values',
  'Pesquisa Mensal de Comércio - Combustíveis e lubrificantes por UF'
);

INSERT INTO public.economic_indicators (code, name, category, frequency, unit, is_regional, api_id) 
SELECT 'PMC_COMB_UF', 'Varejo - Combustíveis (Regional)', 'comercio', 'monthly', 'Índice base 100', true, id
FROM public.system_api_registry WHERE name = 'IBGE PMC Combustíveis por UF' LIMIT 1;

-- 3. PMC Farmácia por UF (Tabela 8880, Classificação Artigos farmacêuticos 56737)
INSERT INTO public.system_api_registry (
  name, 
  provider, 
  base_url, 
  status, 
  target_table,
  description
) VALUES (
  'IBGE PMC Farmácia por UF',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/8880/n3/all/v/11709/p/all/c11046/56737',
  'active',
  'indicator_regional_values',
  'Pesquisa Mensal de Comércio - Artigos farmacêuticos por UF'
);

INSERT INTO public.economic_indicators (code, name, category, frequency, unit, is_regional, api_id) 
SELECT 'PMC_FARM_UF', 'Varejo - Farmácia (Regional)', 'comercio', 'monthly', 'Índice base 100', true, id
FROM public.system_api_registry WHERE name = 'IBGE PMC Farmácia por UF' LIMIT 1;

-- 4. PMC Móveis/Eletro por UF (Tabela 8880, Classificação Móveis e eletrodomésticos 56739)
INSERT INTO public.system_api_registry (
  name, 
  provider, 
  base_url, 
  status, 
  target_table,
  description
) VALUES (
  'IBGE PMC Móveis/Eletro por UF',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/8880/n3/all/v/11709/p/all/c11046/56739',
  'active',
  'indicator_regional_values',
  'Pesquisa Mensal de Comércio - Móveis e eletrodomésticos por UF'
);

INSERT INTO public.economic_indicators (code, name, category, frequency, unit, is_regional, api_id) 
SELECT 'PMC_MOV_UF', 'Varejo - Móveis/Eletro (Regional)', 'comercio', 'monthly', 'Índice base 100', true, id
FROM public.system_api_registry WHERE name = 'IBGE PMC Móveis/Eletro por UF' LIMIT 1;

-- 5. PMC Vestuário por UF (Tabela 8880, Classificação Tecidos, vestuário 56738)
INSERT INTO public.system_api_registry (
  name, 
  provider, 
  base_url, 
  status, 
  target_table,
  description
) VALUES (
  'IBGE PMC Vestuário por UF',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/8880/n3/all/v/11709/p/all/c11046/56738',
  'active',
  'indicator_regional_values',
  'Pesquisa Mensal de Comércio - Tecidos, vestuário e calçados por UF'
);

INSERT INTO public.economic_indicators (code, name, category, frequency, unit, is_regional, api_id) 
SELECT 'PMC_VEST_UF', 'Varejo - Vestuário (Regional)', 'comercio', 'monthly', 'Índice base 100', true, id
FROM public.system_api_registry WHERE name = 'IBGE PMC Vestuário por UF' LIMIT 1;

-- 6. PMC Material de Construção por UF (Tabela 8881 - Varejo Ampliado, Classificação Mat. Construção 56736)
INSERT INTO public.system_api_registry (
  name, 
  provider, 
  base_url, 
  status, 
  target_table,
  description
) VALUES (
  'IBGE PMC Mat. Construção por UF',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/8881/n3/all/v/7169/p/all/c11046/56733',
  'active',
  'indicator_regional_values',
  'Pesquisa Mensal de Comércio - Material de Construção por UF (Varejo Ampliado)'
);

INSERT INTO public.economic_indicators (code, name, category, frequency, unit, is_regional, api_id) 
SELECT 'PMC_CONST_UF', 'Varejo Ampliado - Mat. Construção (Regional)', 'comercio', 'monthly', 'Índice base 100', true, id
FROM public.system_api_registry WHERE name = 'IBGE PMC Mat. Construção por UF' LIMIT 1;