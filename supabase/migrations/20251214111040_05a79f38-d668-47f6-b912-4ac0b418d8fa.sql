-- =============================================================
-- TABELA DE AUDITORIA DE APIs
-- Registra TODAS as ações do sistema de gestão de APIs
-- =============================================================

CREATE TABLE api_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id UUID REFERENCES system_api_registry(id) ON DELETE SET NULL,
  api_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO',
  action_description TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  error_stack TEXT,
  records_affected INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  http_status INTEGER,
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  environment TEXT DEFAULT 'production',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'API_CREATED', 'API_UPDATED', 'API_DELETED',
    'API_ACTIVATED', 'API_DEACTIVATED',
    'CONNECTION_TEST_SUCCESS', 'CONNECTION_TEST_FAILED',
    'SYNC_STARTED', 'SYNC_SUCCESS', 'SYNC_FAILED', 'SYNC_PARTIAL',
    'DATA_INSERTED', 'DATA_DELETED', 'SCHEMA_CHANGED'
  )),
  CONSTRAINT valid_severity CHECK (severity IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR')),
  CONSTRAINT valid_category CHECK (event_category IN ('CONFIG', 'CONNECTION', 'SYNC', 'DATA'))
);

-- =============================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================

CREATE INDEX idx_audit_api_id ON api_audit_logs(api_id);
CREATE INDEX idx_audit_event_type ON api_audit_logs(event_type);
CREATE INDEX idx_audit_severity ON api_audit_logs(severity);
CREATE INDEX idx_audit_category ON api_audit_logs(event_category);
CREATE INDEX idx_audit_user_id ON api_audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON api_audit_logs(created_at DESC);
CREATE INDEX idx_audit_api_date ON api_audit_logs(api_id, created_at DESC);
CREATE INDEX idx_audit_filter ON api_audit_logs(event_category, severity, created_at DESC);

-- =============================================================
-- PERMISSÕES RLS
-- =============================================================

ALTER TABLE api_audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin e superadmin podem ler logs
CREATE POLICY "Admins can view audit logs"
ON api_audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'superadmin')
  )
);

-- =============================================================
-- FUNÇÃO PARA INSERIR LOG DE AUDITORIA
-- =============================================================

CREATE OR REPLACE FUNCTION log_api_event(
  p_api_id UUID,
  p_api_name TEXT,
  p_event_type TEXT,
  p_event_category TEXT,
  p_severity TEXT,
  p_action_description TEXT,
  p_request_payload JSONB DEFAULT NULL,
  p_response_payload JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_stack TEXT DEFAULT NULL,
  p_records_affected INTEGER DEFAULT 0,
  p_execution_time_ms INTEGER DEFAULT NULL,
  p_http_status INTEGER DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_user_role TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO api_audit_logs (
    api_id, api_name, event_type, event_category, severity,
    action_description, request_payload, response_payload,
    error_message, error_stack, records_affected, execution_time_ms,
    http_status, user_id, user_email, user_role, session_id,
    ip_address, user_agent
  ) VALUES (
    p_api_id, p_api_name, p_event_type, p_event_category, p_severity,
    p_action_description, p_request_payload, p_response_payload,
    p_error_message, p_error_stack, p_records_affected, p_execution_time_ms,
    p_http_status, p_user_id, p_user_email, p_user_role, p_session_id,
    p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- =============================================================
-- TRIGGER: Registra mudanças em system_api_registry automaticamente
-- =============================================================

CREATE OR REPLACE FUNCTION trigger_log_api_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type TEXT;
  v_description TEXT;
  v_severity TEXT;
  v_user_email TEXT;
BEGIN
  -- Buscar email do usuário atual
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'API_CREATED';
    v_description := 'Nova API cadastrada: ' || NEW.name;
    v_severity := 'INFO';
    
    PERFORM log_api_event(
      NEW.id, NEW.name, v_event_type, 'CONFIG', v_severity, v_description,
      to_jsonb(NEW), NULL, NULL, NULL, 0, NULL, NULL,
      auth.uid(), v_user_email, NULL
    );
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar tipo específico de atualização
    IF OLD.auto_fetch_enabled = true AND NEW.auto_fetch_enabled = false THEN
      v_event_type := 'API_DEACTIVATED';
      v_description := 'API desativada: ' || NEW.name;
      v_severity := 'WARNING';
    ELSIF OLD.auto_fetch_enabled = false AND NEW.auto_fetch_enabled = true THEN
      v_event_type := 'API_ACTIVATED';
      v_description := 'API ativada: ' || NEW.name;
      v_severity := 'INFO';
    ELSE
      v_event_type := 'API_UPDATED';
      v_description := 'API atualizada: ' || NEW.name;
      v_severity := 'INFO';
    END IF;
    
    PERFORM log_api_event(
      NEW.id, NEW.name, v_event_type, 'CONFIG', v_severity, v_description,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
      NULL, NULL, NULL, 0, NULL, NULL,
      auth.uid(), v_user_email, NULL
    );
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'API_DELETED';
    v_description := 'API removida: ' || OLD.name;
    v_severity := 'WARNING';
    
    PERFORM log_api_event(
      OLD.id, OLD.name, v_event_type, 'CONFIG', v_severity, v_description,
      to_jsonb(OLD), NULL, NULL, NULL, 0, NULL, NULL,
      auth.uid(), v_user_email, NULL
    );
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS api_registry_audit_trigger ON system_api_registry;
CREATE TRIGGER api_registry_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON system_api_registry
FOR EACH ROW EXECUTE FUNCTION trigger_log_api_changes();

-- Comentários
COMMENT ON TABLE api_audit_logs IS 'Audit log for all API management operations. Logs are immutable.';
COMMENT ON FUNCTION log_api_event IS 'Inserts an audit log entry for API operations. Called by Edge Functions and triggers.';