-- Create document_routing_log table for tracking document routing and guardrail application
CREATE TABLE document_routing_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  original_category TEXT NOT NULL CHECK (original_category IN ('health', 'study', 'general')),
  final_category TEXT NOT NULL CHECK (final_category IN ('health', 'study', 'general')),
  action_type TEXT NOT NULL CHECK (action_type IN ('auto_expanded', 'manual_redirect', 'kept_general')),
  session_id TEXT,
  scope_changed BOOLEAN DEFAULT false,
  disclaimer_shown BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast lookups by document_id and session_id
CREATE INDEX idx_document_routing_log_document_id ON document_routing_log(document_id);
CREATE INDEX idx_document_routing_log_session_id ON document_routing_log(session_id);
CREATE INDEX idx_document_routing_log_created_at ON document_routing_log(created_at DESC);

-- Enable RLS
ALTER TABLE document_routing_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage document routing logs"
ON document_routing_log
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert routing logs"
ON document_routing_log
FOR INSERT
WITH CHECK (true);