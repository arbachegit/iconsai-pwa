-- Create table for contact messages history
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for contact form submissions)
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
WITH CHECK (true);

-- Only admins can read contact messages
CREATE POLICY "Admins can read contact messages"
ON public.contact_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update contact messages
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete contact messages
CREATE POLICY "Admins can delete contact messages"
ON public.contact_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));