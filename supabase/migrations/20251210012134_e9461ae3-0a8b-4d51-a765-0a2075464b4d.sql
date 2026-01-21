-- Update RLS policies to include superadmin role check

-- chat_analytics: Allow superadmin to read
DROP POLICY IF EXISTS "Only admins can read chat analytics" ON public.chat_analytics;
CREATE POLICY "Only admins can read chat analytics" 
ON public.chat_analytics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- documents: Allow superadmin full access
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;
CREATE POLICY "Admins can manage documents" 
ON public.documents 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- profiles: Already has superadmin in some policies, ensure SELECT works
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- user_activity_logs: Allow superadmin to read
DROP POLICY IF EXISTS "Allow read debug logs for admins" ON public.debug_logs;
CREATE POLICY "Allow read debug logs for admins" 
ON public.debug_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- admin_settings: Allow superadmin access
DROP POLICY IF EXISTS "Only admins can read admin settings" ON public.admin_settings;
CREATE POLICY "Only admins can read admin settings" 
ON public.admin_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Only admins can update admin settings" ON public.admin_settings;
CREATE POLICY "Only admins can update admin settings" 
ON public.admin_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));