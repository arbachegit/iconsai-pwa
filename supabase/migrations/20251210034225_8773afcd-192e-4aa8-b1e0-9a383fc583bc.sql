-- Add health check columns to system_api_registry
ALTER TABLE public.system_api_registry 
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_latency_ms INTEGER;