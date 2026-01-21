-- =============================================================
-- MIGRAÇÃO: Trigger de Propagação Automática
-- Implementa REGRA 5 do Prompt Nuclear
-- =============================================================

-- 1. Criar função de notificação para mudanças no API Registry
CREATE OR REPLACE FUNCTION public.notify_api_registry_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar via pg_notify para listeners externos
  PERFORM pg_notify('api_registry_changed', json_build_object(
    'action', TG_OP,
    'api_id', COALESCE(NEW.id, OLD.id)::text,
    'api_name', COALESCE(NEW.name, OLD.name),
    'target_table', COALESCE(NEW.target_table, OLD.target_table),
    'timestamp', NOW()
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Criar trigger que dispara quando API é modificada
DROP TRIGGER IF EXISTS api_registry_change_trigger ON public.system_api_registry;

CREATE TRIGGER api_registry_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.system_api_registry
FOR EACH ROW EXECUTE FUNCTION public.notify_api_registry_change();

-- 3. Comentário explicativo
COMMENT ON FUNCTION public.notify_api_registry_change() IS 
'Trigger function that notifies changes to system_api_registry table. 
Used for automatic propagation to all dependent visualization panels.';