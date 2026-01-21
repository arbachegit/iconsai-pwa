-- Add configuration fields for API data fetching
ALTER TABLE system_api_registry 
ADD COLUMN IF NOT EXISTS fetch_start_date DATE DEFAULT '2010-01-01',
ADD COLUMN IF NOT EXISTS fetch_end_date DATE,
ADD COLUMN IF NOT EXISTS auto_fetch_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_fetch_interval TEXT DEFAULT 'daily';

-- Add comments for documentation
COMMENT ON COLUMN system_api_registry.fetch_start_date IS 'Data início para busca de dados';
COMMENT ON COLUMN system_api_registry.fetch_end_date IS 'Data fim para busca de dados (null = até hoje)';
COMMENT ON COLUMN system_api_registry.auto_fetch_enabled IS 'Habilita busca automática de dados';
COMMENT ON COLUMN system_api_registry.auto_fetch_interval IS 'Intervalo: 6hours, daily, weekly, monthly';