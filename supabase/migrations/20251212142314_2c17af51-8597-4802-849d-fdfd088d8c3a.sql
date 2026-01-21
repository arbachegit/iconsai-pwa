-- First, drop the existing provider check constraint and recreate with IPEADATA
ALTER TABLE system_api_registry DROP CONSTRAINT IF EXISTS system_api_registry_provider_check;

ALTER TABLE system_api_registry 
ADD CONSTRAINT system_api_registry_provider_check 
CHECK (provider IN ('BCB', 'IBGE', 'IPEADATA', 'WorldBank', 'IMF', 'YahooFinance', 'Internal', 'Scraper'));

-- Now insert IPEADATA APIs into system_api_registry
INSERT INTO system_api_registry (
  name,
  provider,
  base_url,
  description,
  status,
  target_table,
  fetch_start_date,
  fetch_end_date,
  redundant_api_url
) VALUES 
-- IPCA (Primary: IPEADATA, Fallback: SIDRA 1737)
(
  'IPCA - IPEADATA',
  'IPEADATA',
  'http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO=''PRECOS12_IPCA12'')',
  'Índice Nacional de Preços ao Consumidor Amplo (IPCA) - Série mensal via IPEADATA OData API',
  'active',
  'indicator_values',
  '2010-01-01',
  NULL,
  'https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/-120/variaveis/63?localidades=N1[all]'
),
-- PIB Mensal (Primary: IPEADATA, Fallback: SIDRA 1846)
(
  'PIB Mensal - IPEADATA',
  'IPEADATA',
  'http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO=''BM12_PIB12'')',
  'Produto Interno Bruto mensal - Série via IPEADATA OData API',
  'active',
  'indicator_values',
  '2010-01-01',
  NULL,
  'https://servicodados.ibge.gov.br/api/v3/agregados/1846/periodos/-40/variaveis/93?localidades=N1[all]'
),
-- Taxa SELIC (Primary: IPEADATA, Fallback: BCB/SGS 432)
(
  'Taxa Selic - IPEADATA',
  'IPEADATA',
  'http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO=''BM12_TJOVER12'')',
  'Taxa de juros SELIC Over - Série mensal via IPEADATA OData API',
  'active',
  'indicator_values',
  '2010-01-01',
  NULL,
  'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json'
),
-- Dólar R$/US$ (Primary: IPEADATA, Fallback: BCB/SGS 1)
(
  'Dólar PTAX - IPEADATA',
  'IPEADATA',
  'http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO=''BM366_CAMBV366'')',
  'Taxa de câmbio Dólar/Real (venda) - Série diária via IPEADATA OData API',
  'active',
  'indicator_values',
  '2010-01-01',
  NULL,
  'https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json'
),
-- Taxa de Desocupação (Primary: IPEADATA, Fallback: SIDRA 4090)
(
  'Taxa Desocupação - IPEADATA',
  'IPEADATA',
  'http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO=''PNADC_TD'')',
  'Taxa de desocupação PNAD Contínua - Série via IPEADATA OData API',
  'active',
  'indicator_values',
  '2012-01-01',
  NULL,
  'https://servicodados.ibge.gov.br/api/v3/agregados/4090/periodos/-40/variaveis/4099?localidades=N1[all]'
),
-- IGP-M (Exclusive IPEADATA - no fallback)
(
  'IGP-M - IPEADATA',
  'IPEADATA',
  'http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO=''IGP12_IGPM12'')',
  'Índice Geral de Preços do Mercado (IGP-M) - Série mensal exclusiva IPEADATA',
  'active',
  'indicator_values',
  '2010-01-01',
  NULL,
  NULL
)
ON CONFLICT DO NOTHING;