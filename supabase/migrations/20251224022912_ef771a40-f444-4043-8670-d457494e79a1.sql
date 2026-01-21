-- Remove "Health" from notification_templates
UPDATE notification_templates 
SET platform_name = 'Plataforma KnowYOU'
WHERE platform_name LIKE '%Health%';

-- Update chat_agents to remove "Health" references
UPDATE chat_agents 
SET 
  name = 'Chat KnowYOU',
  description = 'Assistente IA KnowYOU'
WHERE slug = 'health';