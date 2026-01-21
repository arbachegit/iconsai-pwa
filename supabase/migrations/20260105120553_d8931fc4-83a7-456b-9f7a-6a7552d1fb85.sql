-- Add agent_slug column to existing pwa_messages table for module filtering
ALTER TABLE pwa_messages ADD COLUMN IF NOT EXISTS agent_slug TEXT DEFAULT 'economia';

-- Create index for efficient filtering by agent
CREATE INDEX IF NOT EXISTS idx_pwa_messages_agent_slug ON pwa_messages(agent_slug);

-- Add comment
COMMENT ON COLUMN pwa_messages.agent_slug IS 'Which module/agent this message belongs to: economia, health, ideas, help';