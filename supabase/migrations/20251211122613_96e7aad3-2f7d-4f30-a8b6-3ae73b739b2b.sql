-- Add columns for storing discovered period from API (real availability)
ALTER TABLE public.system_api_registry 
ADD COLUMN IF NOT EXISTS discovered_period_start DATE,
ADD COLUMN IF NOT EXISTS discovered_period_end DATE,
ADD COLUMN IF NOT EXISTS period_discovery_date TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.system_api_registry.discovered_period_start IS 'Primeiro período com dados reais descoberto da API';
COMMENT ON COLUMN public.system_api_registry.discovered_period_end IS 'Último período com dados reais descoberto da API';
COMMENT ON COLUMN public.system_api_registry.period_discovery_date IS 'Data em que o período foi descoberto/atualizado';