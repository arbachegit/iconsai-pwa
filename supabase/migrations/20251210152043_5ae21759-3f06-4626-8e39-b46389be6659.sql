-- Create audio_contents table for database-managed audio files
CREATE TABLE public.audio_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  storage_path TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_contents ENABLE ROW LEVEL SECURITY;

-- Admin can manage audio contents
CREATE POLICY "Admins can manage audio contents"
  ON public.audio_contents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Public can read active audio contents
CREATE POLICY "Public can read active audio contents"
  ON public.audio_contents FOR SELECT
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_audio_contents_updated_at
  BEFORE UPDATE ON public.audio_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_generated_images_updated_at();