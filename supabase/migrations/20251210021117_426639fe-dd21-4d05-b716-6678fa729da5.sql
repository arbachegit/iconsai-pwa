-- Update existing API URLs with date range parameters (2010-present)
UPDATE public.system_api_registry 
SET base_url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=01/01/2010&dataFinal=31/12/2030'
WHERE name = 'BCB Selic' AND provider = 'BCB';

UPDATE public.system_api_registry 
SET base_url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json&dataInicial=01/01/2010&dataFinal=31/12/2030'
WHERE name = 'BCB Dólar PTAX' AND provider = 'BCB';

UPDATE public.system_api_registry 
SET base_url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=01/01/2010&dataFinal=31/12/2030'
WHERE name = 'BCB CDI' AND provider = 'BCB';

UPDATE public.system_api_registry 
SET base_url = 'https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/201001-202512/variaveis/63?localidades=N1[all]'
WHERE name = 'IBGE IPCA' AND provider = 'IBGE';

UPDATE public.system_api_registry 
SET base_url = 'https://servicodados.ibge.gov.br/api/v3/agregados/1620/periodos/201001-202512/variaveis/583?localidades=N1[all]'
WHERE name = 'IBGE PIB' AND provider = 'IBGE';

UPDATE public.system_api_registry 
SET base_url = 'https://servicodados.ibge.gov.br/api/v3/agregados/8880/periodos/201201-202512/variaveis/11709?localidades=N1[all]'
WHERE name = 'IBGE PMC Varejo' AND provider = 'IBGE';

-- Add new API endpoints for missing indicators
INSERT INTO public.system_api_registry (name, provider, base_url, method, status, description)
VALUES 
  ('IBGE PNAD Desemprego', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/4099/periodos/201201-202512/variaveis/4099?localidades=N1[all]', 'GET', 'active', 'Taxa de desocupação PNAD Contínua'),
  ('IBGE PMC Vestuário', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/8880/periodos/201201-202512/variaveis/11709?localidades=N1[all]&classificacao=12023[45998]', 'GET', 'active', 'PMC - Vestuário, calçados e acessórios'),
  ('IBGE PMC Móveis/Eletro', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/8880/periodos/201201-202512/variaveis/11709?localidades=N1[all]&classificacao=12023[45999]', 'GET', 'active', 'PMC - Móveis e eletrodomésticos'),
  ('IBGE PMC Farmácia', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/8880/periodos/201201-202512/variaveis/11709?localidades=N1[all]&classificacao=12023[46000]', 'GET', 'active', 'PMC - Artigos farmacêuticos e perfumaria'),
  ('IBGE PMC Combustíveis', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/8880/periodos/201201-202512/variaveis/11709?localidades=N1[all]&classificacao=12023[46001]', 'GET', 'active', 'PMC - Combustíveis e lubrificantes'),
  ('IBGE PMC Veículos', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/8881/periodos/201201-202512/variaveis/11709?localidades=N1[all]&classificacao=12023[46005]', 'GET', 'active', 'PMC Ampliado - Veículos e motos'),
  ('IBGE PMC Mat. Construção', 'IBGE', 'https://servicodados.ibge.gov.br/api/v3/agregados/8881/periodos/201201-202512/variaveis/11709?localidades=N1[all]&classificacao=12023[46006]', 'GET', 'active', 'PMC Ampliado - Material de construção')
ON CONFLICT DO NOTHING;

-- Get API IDs for new indicators
DO $$
DECLARE
  api_desemprego_id uuid;
  api_vestuario_id uuid;
  api_moveis_id uuid;
  api_farmacia_id uuid;
  api_combustiveis_id uuid;
  api_veiculos_id uuid;
  api_construcao_id uuid;
BEGIN
  SELECT id INTO api_desemprego_id FROM public.system_api_registry WHERE name = 'IBGE PNAD Desemprego' LIMIT 1;
  SELECT id INTO api_vestuario_id FROM public.system_api_registry WHERE name = 'IBGE PMC Vestuário' LIMIT 1;
  SELECT id INTO api_moveis_id FROM public.system_api_registry WHERE name = 'IBGE PMC Móveis/Eletro' LIMIT 1;
  SELECT id INTO api_farmacia_id FROM public.system_api_registry WHERE name = 'IBGE PMC Farmácia' LIMIT 1;
  SELECT id INTO api_combustiveis_id FROM public.system_api_registry WHERE name = 'IBGE PMC Combustíveis' LIMIT 1;
  SELECT id INTO api_veiculos_id FROM public.system_api_registry WHERE name = 'IBGE PMC Veículos' LIMIT 1;
  SELECT id INTO api_construcao_id FROM public.system_api_registry WHERE name = 'IBGE PMC Mat. Construção' LIMIT 1;

  -- Add new economic indicators
  INSERT INTO public.economic_indicators (name, code, frequency, unit, api_id)
  VALUES 
    ('Desemprego (PNAD)', '4099', 'monthly', '%', api_desemprego_id),
    ('Varejo - Vestuário', 'PMC_VEST', 'monthly', 'Índice', api_vestuario_id),
    ('Varejo - Móveis/Eletro', 'PMC_MOV', 'monthly', 'Índice', api_moveis_id),
    ('Varejo - Farmácia', 'PMC_FARM', 'monthly', 'Índice', api_farmacia_id),
    ('Varejo - Combustíveis', 'PMC_COMB', 'monthly', 'Índice', api_combustiveis_id),
    ('Varejo Ampliado - Veículos', 'PMC_VEIC', 'monthly', 'Índice', api_veiculos_id),
    ('Varejo Ampliado - Mat. Construção', 'PMC_CONST', 'monthly', 'Índice', api_construcao_id),
    ('Confiança do Consumidor', 'ICC', 'monthly', 'Pontos', NULL)
  ON CONFLICT DO NOTHING;

  -- Add category field to economic_indicators for sectioned UI
  BEGIN
    ALTER TABLE public.economic_indicators ADD COLUMN IF NOT EXISTS category text DEFAULT 'macro';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- Update categories
  UPDATE public.economic_indicators SET category = 'macro' WHERE code IN ('432', '1', '12', '1737', '1620', '4099', 'ICC');
  UPDATE public.economic_indicators SET category = 'varejo_restrito' WHERE code LIKE 'PMC_%' AND code NOT IN ('PMC_VEIC', 'PMC_CONST');
  UPDATE public.economic_indicators SET category = 'varejo_ampliado' WHERE code IN ('PMC_VEIC', 'PMC_CONST', '8880');
END $$;