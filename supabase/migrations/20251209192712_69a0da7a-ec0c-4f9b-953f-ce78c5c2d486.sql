-- Add public read policy for notification_templates
-- This allows the frontend dispatcher to fetch templates
CREATE POLICY "Public can read notification templates"
ON public.notification_templates FOR SELECT
TO public
USING (true);