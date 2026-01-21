-- Drop existing constraints and recreate with correct values
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_target_chat_check;
ALTER TABLE documents ADD CONSTRAINT documents_target_chat_check 
  CHECK (target_chat IN ('health', 'study', 'general', 'economia'));

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'processed'));