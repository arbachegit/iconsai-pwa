-- FASE 1: Adicionar colunas de snapshot e rollback real
-- Adiciona referência ao Storage para snapshots e identificador de snapshot

ALTER TABLE document_versions 
ADD COLUMN IF NOT EXISTS storage_reference_id UUID,
ADD COLUMN IF NOT EXISTS snapshot_id TEXT;

-- Comentários explicativos
COMMENT ON COLUMN document_versions.storage_reference_id IS 'Referência ao arquivo de snapshot no Supabase Storage para rollback real';
COMMENT ON COLUMN document_versions.snapshot_id IS 'Identificador único do snapshot para versionamento (formato: snapshot_YYYY-MM-DD_TIMESTAMP)';

-- Índice para performance em consultas de rollback
CREATE INDEX IF NOT EXISTS idx_document_versions_snapshot ON document_versions(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_storage_ref ON document_versions(storage_reference_id);