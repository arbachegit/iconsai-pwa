-- Create taxonomy_rules table for managing stopwords, generic terms, PII patterns, and domain rules
CREATE TABLE public.taxonomy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('stopword', 'generic', 'pii_pattern', 'health_term', 'study_term', 'cardinality')),
  rule_value TEXT NOT NULL,
  domain TEXT DEFAULT 'general' CHECK (domain IN ('general', 'health', 'study')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'admin'
);

-- Create unique index to prevent duplicate rules
CREATE UNIQUE INDEX idx_taxonomy_rules_unique ON public.taxonomy_rules (rule_type, rule_value, domain) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.taxonomy_rules ENABLE ROW LEVEL SECURITY;

-- Admin can manage taxonomy rules
CREATE POLICY "Admins can manage taxonomy rules"
ON public.taxonomy_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can read taxonomy rules for validation
CREATE POLICY "System can read taxonomy rules"
ON public.taxonomy_rules
FOR SELECT
USING (true);

-- Insert default stopwords
INSERT INTO public.taxonomy_rules (rule_type, rule_value, domain, description) VALUES
('stopword', 'de', 'general', 'Preposição'),
('stopword', 'da', 'general', 'Preposição'),
('stopword', 'do', 'general', 'Preposição'),
('stopword', 'para', 'general', 'Preposição'),
('stopword', 'com', 'general', 'Preposição'),
('stopword', 'the', 'general', 'Article'),
('stopword', 'and', 'general', 'Conjunction'),
('stopword', 'or', 'general', 'Conjunction');

-- Insert default generic terms
INSERT INTO public.taxonomy_rules (rule_type, rule_value, domain, description) VALUES
('generic', 'documento', 'general', 'Termo muito genérico'),
('generic', 'arquivo', 'general', 'Termo muito genérico'),
('generic', 'dados', 'general', 'Termo muito genérico'),
('generic', 'informação', 'general', 'Termo muito genérico'),
('generic', 'sistema', 'general', 'Termo muito genérico'),
('generic', 'document', 'general', 'Generic term'),
('generic', 'file', 'general', 'Generic term'),
('generic', 'data', 'general', 'Generic term');