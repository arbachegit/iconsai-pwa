-- Adicionar constraint UNIQUE para permitir upsert na tabela pwa_conversation_summaries
ALTER TABLE pwa_conversation_summaries 
ADD CONSTRAINT pwa_summaries_device_module_unique 
UNIQUE (device_id, module_type);