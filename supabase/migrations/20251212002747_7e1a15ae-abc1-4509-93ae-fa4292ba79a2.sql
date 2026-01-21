-- Habilitar Supabase Realtime para a tabela fonte de verdade
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_api_registry;

-- Configurar REPLICA IDENTITY para capturar todas as mudanças (INSERT, UPDATE, DELETE)
ALTER TABLE public.system_api_registry REPLICA IDENTITY FULL;