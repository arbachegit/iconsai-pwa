-- Remove old constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_rename_reason_check;

-- Add expanded constraint with all rename reason values
ALTER TABLE documents ADD CONSTRAINT documents_rename_reason_check 
  CHECK (rename_reason IS NULL OR rename_reason IN (
    -- Auto-detected problems (OriginalTitleProblem)
    'numeric',
    'hash', 
    'uuid',
    'unreadable',
    'technical',
    'mixed_pattern',
    -- Manual actions (RenameReason)
    'approved_ai_suggestion',
    'manual_edit', 
    'auto_metadata',
    'auto_first_lines',
    'bulk_rename',
    'merged_documents'
  ));