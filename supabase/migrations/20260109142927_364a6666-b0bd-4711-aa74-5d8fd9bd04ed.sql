-- =====================================================
-- PWA Tables: Complete Schema Alignment
-- Corrige constraints, adiciona índices e documentação
-- =====================================================

-- 1. Corrigir CHECK Constraints
-- -----------------------------------------------------

-- 1.1 module_type: adicionar 'help'
ALTER TABLE pwa_conversation_sessions 
DROP CONSTRAINT IF EXISTS pwa_conversation_sessions_module_type_check;

ALTER TABLE pwa_conversation_sessions 
ADD CONSTRAINT pwa_conversation_sessions_module_type_check 
CHECK (module_type IN ('world', 'health', 'ideas', 'help'));

-- 1.2 role: adicionar 'summary'
ALTER TABLE pwa_conversation_messages 
DROP CONSTRAINT IF EXISTS pwa_conversation_messages_role_check;

ALTER TABLE pwa_conversation_messages 
ADD CONSTRAINT pwa_conversation_messages_role_check 
CHECK (role IN ('user', 'assistant', 'summary'));

-- 2. Adicionar Índices Faltantes
-- -----------------------------------------------------

-- Sessions
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_device_module 
ON pwa_conversation_sessions(device_id, module_type);

CREATE INDEX IF NOT EXISTS idx_pwa_sessions_last_message 
ON pwa_conversation_sessions(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_pwa_sessions_active 
ON pwa_conversation_sessions(is_active) WHERE is_active = true;

-- Messages
CREATE INDEX IF NOT EXISTS idx_pwa_messages_conversation_id 
ON pwa_conversation_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_pwa_messages_role 
ON pwa_conversation_messages(role);

CREATE INDEX IF NOT EXISTS idx_pwa_messages_device_session 
ON pwa_conversation_messages(device_id, session_id);

-- 3. Atualizar Funções de Validação
-- -----------------------------------------------------

-- Atualizar função de validação de module_type
CREATE OR REPLACE FUNCTION validate_session_module_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.module_type NOT IN ('world', 'health', 'ideas', 'help') THEN
    RAISE EXCEPTION 'module_type deve ser: world, health, ideas ou help';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar função de validação de role
CREATE OR REPLACE FUNCTION validate_message_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role NOT IN ('user', 'assistant', 'summary') THEN
    RAISE EXCEPTION 'role deve ser: user, assistant ou summary';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Adicionar Comentários de Documentação
-- -----------------------------------------------------

COMMENT ON TABLE pwa_conversation_sessions IS 
  'Sessoes de conversa do PWA, agrupadas por device_id e module_type';

COMMENT ON TABLE pwa_conversation_messages IS 
  'Mensagens individuais das conversas PWA';

COMMENT ON COLUMN pwa_conversation_sessions.module_type IS 
  'Tipo do modulo: world (economia), health (saude), ideas (ideias), help (ajuda)';

COMMENT ON COLUMN pwa_conversation_sessions.is_active IS 
  'Indica se a sessao ainda esta ativa para novas mensagens';

COMMENT ON COLUMN pwa_conversation_sessions.last_message_at IS 
  'Timestamp da ultima mensagem recebida na sessao';

COMMENT ON COLUMN pwa_conversation_sessions.message_count IS 
  'Contador de mensagens na sessao (atualizado via trigger)';

COMMENT ON COLUMN pwa_conversation_messages.role IS 
  'Papel da mensagem: user, assistant ou summary';

COMMENT ON COLUMN pwa_conversation_messages.conversation_id IS 
  'ID para agrupar mensagens em uma conversa especifica dentro da sessao';

COMMENT ON COLUMN pwa_conversation_messages.audio_duration IS 
  'Duracao do audio em segundos (para mensagens de voz)';