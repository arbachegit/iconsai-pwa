-- Remove a constraint antiga que só permite 'active' e 'inactive'
ALTER TABLE public.system_api_registry 
DROP CONSTRAINT IF EXISTS system_api_registry_status_check;

-- Adiciona nova constraint incluindo 'error' como valor válido
ALTER TABLE public.system_api_registry 
ADD CONSTRAINT system_api_registry_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'error'::text]));