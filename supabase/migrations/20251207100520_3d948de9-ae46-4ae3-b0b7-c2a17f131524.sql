-- Create documentation_sync_log table for tracking synchronization status
CREATE TABLE public.documentation_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id TEXT NOT NULL UNIQUE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  triggered_by TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  current_phase TEXT,
  progress INTEGER DEFAULT 0,
  phases_completed JSONB DEFAULT '[]'::jsonb,
  changes_detected JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentation_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage sync logs"
ON public.documentation_sync_log
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert sync logs"
ON public.documentation_sync_log
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update sync logs"
ON public.documentation_sync_log
FOR UPDATE
USING (true);

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.documentation_sync_log;

-- Create index for efficient queries
CREATE INDEX idx_documentation_sync_log_status ON public.documentation_sync_log(status);
CREATE INDEX idx_documentation_sync_log_started_at ON public.documentation_sync_log(started_at DESC);