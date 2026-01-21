-- Add processing_progress column to documents table for tracking chunk processing
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.documents.processing_progress IS 'Processing progress percentage (0-100) for chunking operations';