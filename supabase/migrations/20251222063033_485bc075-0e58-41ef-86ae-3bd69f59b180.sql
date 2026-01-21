-- Add title renaming audit columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_title TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS title_was_renamed BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS renamed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rename_reason TEXT;

-- Add constraint for rename_reason values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_rename_reason_check'
  ) THEN
    ALTER TABLE documents ADD CONSTRAINT documents_rename_reason_check 
      CHECK (rename_reason IS NULL OR rename_reason IN (
        'approved_ai_suggestion',
        'manual_edit', 
        'auto_metadata',
        'auto_first_lines',
        'bulk_rename',
        'merged_documents'
      ));
  END IF;
END $$;