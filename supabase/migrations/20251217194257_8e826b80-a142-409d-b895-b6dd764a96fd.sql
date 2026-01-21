-- Adicionar coluna de localização única por agente
ALTER TABLE chat_agents 
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;

-- Criar índice único parcial (apenas para localizações não-nulas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_agents_location_unique 
ON chat_agents (location) 
WHERE location IS NOT NULL;

-- Atualizar agentes existentes com suas localizações
UPDATE chat_agents SET location = '/index (Seção KnowYOU)' WHERE slug = 'study';
UPDATE chat_agents SET location = '/index (Float Button)' WHERE slug = 'company';
UPDATE chat_agents SET location = '/app' WHERE slug = 'analyst_user';
UPDATE chat_agents SET location = '/dashboard' WHERE slug = 'analyst_admin';
UPDATE chat_agents SET location = '/dashboard (Float Button)' WHERE slug = 'analyst';