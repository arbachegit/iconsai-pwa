-- Add telemetry columns to system_api_registry for detailed API monitoring
ALTER TABLE system_api_registry 
ADD COLUMN IF NOT EXISTS target_table TEXT DEFAULT 'indicator_values',
ADD COLUMN IF NOT EXISTS last_http_status INTEGER,
ADD COLUMN IF NOT EXISTS last_sync_metadata JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN system_api_registry.target_table IS 'Nome da tabela interna alimentada por esta API';
COMMENT ON COLUMN system_api_registry.last_http_status IS 'Código HTTP da última chamada (200, 404, 406, etc)';
COMMENT ON COLUMN system_api_registry.last_sync_metadata IS 'Metadados da última sincronização: {extracted_count, period_start, period_end, fields_detected}';