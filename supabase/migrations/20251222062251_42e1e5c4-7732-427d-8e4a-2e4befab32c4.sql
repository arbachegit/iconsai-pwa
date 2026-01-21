-- Add title_source column to documents table
ALTER TABLE public.documents 
ADD COLUMN title_source text 
CHECK (title_source IN ('metadata', 'filename', 'ai', 'first_lines', 'manual'));