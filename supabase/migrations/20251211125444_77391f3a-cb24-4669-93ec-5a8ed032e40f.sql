-- Adicionar colunas para redundância e armazenamento de JSON bruto
ALTER TABLE public.system_api_registry 
ADD COLUMN IF NOT EXISTS redundant_aggregate_id TEXT,
ADD COLUMN IF NOT EXISTS redundant_api_url TEXT,
ADD COLUMN IF NOT EXISTS last_raw_response JSONB,
ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ;

-- Comentários explicativos
COMMENT ON COLUMN public.system_api_registry.redundant_aggregate_id IS 'ID do agregado de backup (Linha 2) para contingência';
COMMENT ON COLUMN public.system_api_registry.redundant_api_url IS 'URL completa da API de redundância (Linha 2)';
COMMENT ON COLUMN public.system_api_registry.last_raw_response IS 'JSON bruto completo da última resposta da API';
COMMENT ON COLUMN public.system_api_registry.last_response_at IS 'Timestamp da última coleta bem-sucedida';