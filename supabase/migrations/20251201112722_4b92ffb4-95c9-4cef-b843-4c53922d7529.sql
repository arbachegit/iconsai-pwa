-- Create section_content_versions table for version history
CREATE TABLE public.section_content_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id TEXT NOT NULL,
  header TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  change_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.section_content_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for version history
CREATE POLICY "Everyone can read section content versions"
  ON public.section_content_versions
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage section content versions"
  ON public.section_content_versions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_section_content_versions_section_id ON public.section_content_versions(section_id);
CREATE INDEX idx_section_content_versions_created_at ON public.section_content_versions(created_at DESC);