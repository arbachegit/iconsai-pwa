-- ============================================
-- MIGRATION: Completar tabelas PWA conversations
-- ============================================

-- 1. SESSIONS: Adicionar colunas faltantes
ALTER TABLE pwa_conversation_sessions
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. MESSAGES: Adicionar colunas faltantes
ALTER TABLE pwa_conversation_messages
ADD COLUMN IF NOT EXISTS conversation_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. MESSAGES: Alterar tipo de audio_duration
ALTER TABLE pwa_conversation_messages
ALTER COLUMN audio_duration_seconds TYPE NUMERIC 
  USING audio_duration_seconds::NUMERIC;

ALTER TABLE pwa_conversation_messages
RENAME COLUMN audio_duration_seconds TO audio_duration;

-- 4. MESSAGES: FK com CASCADE
ALTER TABLE pwa_conversation_messages
DROP CONSTRAINT IF EXISTS pwa_conversation_messages_session_id_fkey;

ALTER TABLE pwa_conversation_messages
ADD CONSTRAINT fk_pwa_messages_session 
  FOREIGN KEY (session_id) 
  REFERENCES pwa_conversation_sessions(id) 
  ON DELETE CASCADE;

-- 5. Validation triggers
CREATE OR REPLACE FUNCTION validate_session_module_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.module_type NOT IN ('world', 'health', 'ideas', 'help') THEN
    RAISE EXCEPTION 'module_type deve ser: world, health, ideas ou help';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_session_module 
ON pwa_conversation_sessions;

CREATE TRIGGER trg_validate_session_module
BEFORE INSERT OR UPDATE ON pwa_conversation_sessions
FOR EACH ROW
EXECUTE FUNCTION validate_session_module_type();

CREATE OR REPLACE FUNCTION validate_message_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role NOT IN ('user', 'assistant', 'summary') THEN
    RAISE EXCEPTION 'role deve ser: user, assistant ou summary';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_message_role 
ON pwa_conversation_messages;

CREATE TRIGGER trg_validate_message_role
BEFORE INSERT OR UPDATE ON pwa_conversation_messages
FOR EACH ROW
EXECUTE FUNCTION validate_message_role();

-- 6. Trigger para incrementar message_count
CREATE OR REPLACE FUNCTION increment_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pwa_conversation_sessions
  SET 
    message_count = message_count + 1,
    last_message_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_message_count 
ON pwa_conversation_messages;

CREATE TRIGGER trg_increment_message_count
AFTER INSERT ON pwa_conversation_messages
FOR EACH ROW
EXECUTE FUNCTION increment_session_message_count();

-- 7. Índices adicionais
CREATE INDEX IF NOT EXISTS idx_pwa_conv_messages_created_at 
ON pwa_conversation_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pwa_conv_messages_device_created
ON pwa_conversation_messages(device_id, created_at DESC);

-- 8. RLS Policies para service_role
CREATE POLICY "Service role full access sessions"
ON pwa_conversation_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access messages"
ON pwa_conversation_messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);