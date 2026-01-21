-- Create admin_notifications table for real-time alerts
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('new_document', 'new_conversation', 'doc_failed', 'doc_completed', 'doc_stuck')),
  title TEXT NOT NULL,
  message TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage notifications
CREATE POLICY "Admins can manage notifications" 
ON public.admin_notifications
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;