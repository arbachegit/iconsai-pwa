-- Add tracking columns to documents table for insertion management
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS is_inserted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inserted_in_chat TEXT,
ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS redirected_from TEXT;

-- Add comment to columns for documentation
COMMENT ON COLUMN public.documents.is_inserted IS 'Indica se o documento foi inserido em algum chat';
COMMENT ON COLUMN public.documents.inserted_in_chat IS 'Chat onde o documento foi inserido: health, study ou null';
COMMENT ON COLUMN public.documents.inserted_at IS 'Timestamp de quando o documento foi inserido no chat';
COMMENT ON COLUMN public.documents.redirected_from IS 'Categoria original se foi redirecionado de general';