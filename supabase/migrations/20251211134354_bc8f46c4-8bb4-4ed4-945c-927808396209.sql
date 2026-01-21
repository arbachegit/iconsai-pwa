-- Drop existing provider constraint and add new one with international providers
ALTER TABLE system_api_registry DROP CONSTRAINT IF EXISTS system_api_registry_provider_check;
ALTER TABLE system_api_registry ADD CONSTRAINT system_api_registry_provider_check 
  CHECK (provider IN ('BCB', 'IBGE', 'WorldBank', 'IMF', 'YahooFinance', 'Internal', 'Scraper'));

-- Now insert international APIs
INSERT INTO system_api_registry (name, provider, base_url, method, status, description)
VALUES 
  (
    'PIB per capita (PPC)',
    'WorldBank',
    'https://api.worldbank.org/v2/country/br/indicator/NY.GDP.PCAP.PP.CD?format=json&per_page=100',
    'GET',
    'active',
    'PIB per capita em dólares PPC - Banco Mundial'
  ),
  (
    'IMF GDP Brazil',
    'IMF',
    'https://www.imf.org/external/datamapper/api/v1/NGDPD/BRA',
    'GET',
    'active',
    'PIB Nominal do Brasil - FMI (Fallback)'
  )
ON CONFLICT DO NOTHING;