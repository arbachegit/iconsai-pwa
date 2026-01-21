-- Adicionar coluna context_code à tabela maieutic_metrics
ALTER TABLE maieutic_metrics 
ADD COLUMN IF NOT EXISTS context_code TEXT;

-- Criar índice para consultas por contexto
CREATE INDEX IF NOT EXISTS idx_maieutic_metrics_context 
ON maieutic_metrics(context_code);

-- Comentário para documentação
COMMENT ON COLUMN maieutic_metrics.context_code IS 
'Código do contexto detectado pelo orquestrador (ex: economia, saude, geral)';