-- Create table to store learned tag mappings (machine learning rules)
CREATE TABLE public.tag_merge_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_tag TEXT NOT NULL,
  canonical_tag TEXT NOT NULL,
  chat_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  merge_count INTEGER DEFAULT 1,
  UNIQUE(source_tag, chat_type)
);

-- Enable RLS
ALTER TABLE public.tag_merge_rules ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin role to manage rules
CREATE POLICY "Admins can manage tag merge rules"
ON public.tag_merge_rules
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow reading rules for tag suggestion (needed by edge functions)
CREATE POLICY "Service role can read tag merge rules"
ON public.tag_merge_rules
FOR SELECT
USING (true);

-- Add index for fast lookups during tag generation
CREATE INDEX idx_tag_merge_rules_lookup ON public.tag_merge_rules(source_tag, chat_type);

-- Add comment explaining the table purpose
COMMENT ON TABLE public.tag_merge_rules IS 'Stores learned tag mappings from merge operations to prevent AI from creating duplicate/similar tags';