
-- Create table to log tag modifications on documents
CREATE TABLE public.tag_modification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  document_filename TEXT NOT NULL,
  original_tag_name TEXT NOT NULL,
  new_tag_name TEXT NOT NULL,
  modification_type TEXT NOT NULL DEFAULT 'merge',
  merge_rule_id UUID REFERENCES public.tag_merge_rules(id) ON DELETE SET NULL,
  chat_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'system'
);

-- Enable RLS
ALTER TABLE public.tag_modification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage tag modification logs"
ON public.tag_modification_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert tag modification logs"
ON public.tag_modification_logs
FOR INSERT
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_tag_modification_logs_document ON public.tag_modification_logs(document_id);
CREATE INDEX idx_tag_modification_logs_created ON public.tag_modification_logs(created_at DESC);
