-- Add duplicate_similarity_threshold column to chat_config table
ALTER TABLE public.chat_config 
ADD COLUMN IF NOT EXISTS duplicate_similarity_threshold numeric DEFAULT 0.90;

-- Add comment explaining the column
COMMENT ON COLUMN public.chat_config.duplicate_similarity_threshold IS 'Threshold for duplicate document detection (0.85-0.95). Documents with similarity above this value are flagged as duplicates.';