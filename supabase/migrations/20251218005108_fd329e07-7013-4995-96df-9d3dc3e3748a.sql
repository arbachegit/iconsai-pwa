-- ============================================================================
-- RENDA PER CAPITA INDICATORS - DATABASE CONFIGURATION
-- ============================================================================

-- 1. Create API entries in system_api_registry (simple INSERT)

-- IBGE Rendimento Médio Brasil (Table 7531 - Total class only)
INSERT INTO public.system_api_registry (
  name, provider, base_url, method, description, status, target_table,
  auto_fetch_enabled, auto_fetch_interval, fetch_start_date
) VALUES (
  'IBGE Rendimento Médio Brasil',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/7531/n1/all/v/10824/p/all/c1019/49040',
  'GET',
  'Rendimento médio per capita - Brasil (classe Total)',
  'active',
  'indicator_values',
  true,
  'monthly',
  '2012-01-01'
);

-- IBGE Rendimento Médio por UF (Table 7533)
INSERT INTO public.system_api_registry (
  name, provider, base_url, method, description, status, target_table,
  auto_fetch_enabled, auto_fetch_interval, fetch_start_date
) VALUES (
  'IBGE Rendimento Médio UF',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/7533/n3/all/v/10824/p/all',
  'GET',
  'Rendimento médio per capita por Unidade da Federação',
  'active',
  'indicator_regional_values',
  true,
  'monthly',
  '2012-01-01'
);

-- IBGE Índice de Gini Brasil (Table 7435)
INSERT INTO public.system_api_registry (
  name, provider, base_url, method, description, status, target_table,
  auto_fetch_enabled, auto_fetch_interval, fetch_start_date
) VALUES (
  'IBGE Gini Brasil',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/7435/n1/all/v/10681/p/all',
  'GET',
  'Índice de Gini (desigualdade de renda) - Brasil',
  'active',
  'indicator_values',
  true,
  'monthly',
  '2012-01-01'
);

-- IBGE Índice de Gini por UF (Table 7435 with n3)
INSERT INTO public.system_api_registry (
  name, provider, base_url, method, description, status, target_table,
  auto_fetch_enabled, auto_fetch_interval, fetch_start_date
) VALUES (
  'IBGE Gini UF',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/7435/n3/all/v/10681/p/all',
  'GET',
  'Índice de Gini (desigualdade de renda) por UF',
  'active',
  'indicator_regional_values',
  true,
  'monthly',
  '2012-01-01'
);

-- 2. Create economic_indicators entries linked to APIs

-- Rendimento Médio Brasil
INSERT INTO public.economic_indicators (code, name, category, unit, frequency, is_regional, api_id) 
SELECT 'RENDA_MEDIA', 'Rendimento Médio Per Capita', 'renda', 'R$', 'annual', false, id
FROM public.system_api_registry WHERE name = 'IBGE Rendimento Médio Brasil';

-- Rendimento Médio UF
INSERT INTO public.economic_indicators (code, name, category, unit, frequency, is_regional, api_id)
SELECT 'RENDA_MEDIA_UF', 'Rendimento Médio Per Capita (Regional)', 'renda', 'R$', 'annual', true, id
FROM public.system_api_registry WHERE name = 'IBGE Rendimento Médio UF';

-- Gini Brasil
INSERT INTO public.economic_indicators (code, name, category, unit, frequency, is_regional, api_id)
SELECT 'GINI', 'Índice de Gini', 'renda', 'índice', 'annual', false, id
FROM public.system_api_registry WHERE name = 'IBGE Gini Brasil';

-- Gini UF
INSERT INTO public.economic_indicators (code, name, category, unit, frequency, is_regional, api_id)
SELECT 'GINI_UF', 'Índice de Gini (Regional)', 'renda', 'índice', 'annual', true, id
FROM public.system_api_registry WHERE name = 'IBGE Gini UF';