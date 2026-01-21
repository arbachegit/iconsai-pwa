-- Add new API for PMC Veículos Regional (by UF)
INSERT INTO public.system_api_registry (
  name, 
  provider, 
  base_url, 
  status, 
  target_table,
  description
) VALUES (
  'IBGE PMC Veículos por UF',
  'IBGE',
  'https://apisidra.ibge.gov.br/values/t/8881/n3/all/v/7169/p/all/c11046/56736',
  'active',
  'indicator_regional_values',
  'Pesquisa Mensal de Comércio - Veículos, motocicletas, partes e peças por UF'
);

-- Create new economic indicator for PMC Veículos Regional linked to the new API
INSERT INTO public.economic_indicators (
  code,
  name,
  category,
  frequency,
  unit,
  is_regional,
  api_id
) 
SELECT 
  'PMC_VEICULOS_UF',
  'Varejo Ampliado - Veículos (Regional)',
  'comercio',
  'monthly',
  'Índice base 100',
  true,
  id
FROM public.system_api_registry 
WHERE name = 'IBGE PMC Veículos por UF'
LIMIT 1;