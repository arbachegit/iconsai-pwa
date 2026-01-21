-- ============================================================
-- MIGRATION: Fix SIDRA API URLs and Add Source Data Status
-- ============================================================

-- 1. Add source_data_status column to track API data availability
ALTER TABLE system_api_registry 
ADD COLUMN IF NOT EXISTS source_data_status TEXT DEFAULT 'unknown';

ALTER TABLE system_api_registry 
ADD COLUMN IF NOT EXISTS source_data_message TEXT;

-- Add comment for documentation
COMMENT ON COLUMN system_api_registry.source_data_status IS 'Status of source data: unknown, available, unavailable, partial';
COMMENT ON COLUMN system_api_registry.source_data_message IS 'Detailed message about source data availability';

-- 2. Fix PMC Regional API URLs: Change v=11709 to v=7170
-- Variable 11709 returns "..." (not available), Variable 7170 returns actual values

UPDATE system_api_registry 
SET base_url = REPLACE(base_url, 'v/11709', 'v/7170'),
    source_data_status = 'pending_retest',
    source_data_message = 'URL corrigida: variável alterada de 11709 para 7170'
WHERE base_url LIKE '%v/11709%'
  AND (name ILIKE '%PMC%' OR name ILIKE '%Varejo%' OR name ILIKE '%Combustíveis%' 
       OR name ILIKE '%Farmácia%' OR name ILIKE '%Vestuário%' 
       OR name ILIKE '%Mat%Construção%' OR name ILIKE '%Móveis%');

-- 3. Mark known unavailable APIs
UPDATE system_api_registry 
SET source_data_status = 'unavailable',
    source_data_message = 'IBGE SIDRA retorna apenas valores ".." (indisponível) para esta tabela/período'
WHERE (name ILIKE '%Mortalidade Infantil%' 
       OR name ILIKE '%Fecundidade%' 
       OR name ILIKE '%Esperança de Vida%')
  AND provider = 'IBGE';

-- 4. Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_system_api_registry_source_data_status 
ON system_api_registry(source_data_status);