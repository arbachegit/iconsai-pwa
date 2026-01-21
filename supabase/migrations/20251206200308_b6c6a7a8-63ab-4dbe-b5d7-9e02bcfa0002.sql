-- Create tag_management_events table for ML training data
CREATE TABLE public.tag_management_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- State before action
  input_state JSONB NOT NULL,
  
  -- Action type
  action_type TEXT NOT NULL,
  
  -- User decision details
  user_decision JSONB NOT NULL,
  
  -- Optional rationale from user
  rationale TEXT,
  
  -- Session tracking
  session_id TEXT,
  
  -- ML metrics
  similarity_score NUMERIC,
  time_to_decision_ms INTEGER,
  
  -- Audit
  created_by TEXT DEFAULT 'admin'
);

-- Add synonyms column to document_tags
ALTER TABLE public.document_tags ADD COLUMN IF NOT EXISTS synonyms TEXT[] DEFAULT '{}';

-- Enable RLS
ALTER TABLE public.tag_management_events ENABLE ROW LEVEL SECURITY;

-- Admins can manage tag management events
CREATE POLICY "Admins can manage tag management events" 
  ON public.tag_management_events 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert tag management events
CREATE POLICY "System can insert tag management events" 
  ON public.tag_management_events 
  FOR INSERT 
  WITH CHECK (true);