-- Add header column to tooltip_contents table
ALTER TABLE public.tooltip_contents 
ADD COLUMN IF NOT EXISTS header TEXT;

COMMENT ON COLUMN public.tooltip_contents.header IS 'Header opcional do tooltip exibido acima do título';