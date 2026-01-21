-- STEP 0.3: Add RLS policies for public read access to notification configuration
-- This allows frontend dispatcher to access preferences without service role

-- Allow public read access to notification_preferences
CREATE POLICY "Public can read notification preferences"
ON public.notification_preferences FOR SELECT
TO public
USING (true);

-- Allow public read access to admin_settings (needed for email/whatsapp targets)
CREATE POLICY "Public can read admin settings"
ON public.admin_settings FOR SELECT
TO public
USING (true);

-- Allow public insert to notification_logs (for logging from frontend)
CREATE POLICY "Public can insert notification logs"
ON public.notification_logs FOR INSERT
TO public
WITH CHECK (true);