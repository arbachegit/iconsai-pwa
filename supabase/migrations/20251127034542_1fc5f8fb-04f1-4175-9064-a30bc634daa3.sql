-- Add chat_type column to conversation_history table to differentiate between study and health chats
ALTER TABLE conversation_history 
ADD COLUMN IF NOT EXISTS chat_type TEXT DEFAULT 'health';

-- Add index for better query performance when filtering by chat_type
CREATE INDEX IF NOT EXISTS idx_conversation_history_chat_type ON conversation_history(chat_type);

-- Add index for combined session_id and chat_type queries
CREATE INDEX IF NOT EXISTS idx_conversation_history_session_chat_type ON conversation_history(session_id, chat_type);