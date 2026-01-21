-- Create notification_logs table for audit trail
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read notification logs
CREATE POLICY "Admins can read notification logs"
  ON public.notification_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert notification logs
CREATE POLICY "System can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (true);

-- Enable realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;

-- Create index for faster queries
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_event_type ON public.notification_logs(event_type);
CREATE INDEX idx_notification_logs_channel ON public.notification_logs(channel);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);