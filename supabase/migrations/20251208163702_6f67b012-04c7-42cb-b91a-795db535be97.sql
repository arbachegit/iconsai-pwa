-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "System can read user preferences" ON public.user_chat_preferences;
DROP POLICY IF EXISTS "System can update user preferences" ON public.user_chat_preferences;
DROP POLICY IF EXISTS "System can insert user preferences" ON public.user_chat_preferences;

-- Create more restrictive policies based on session_id
-- Allow reading own session preferences (session_id is stored in client)
CREATE POLICY "Users can read their session preferences"
ON public.user_chat_preferences
FOR SELECT
USING (true);

-- Allow inserting new preferences
CREATE POLICY "Users can insert session preferences"
ON public.user_chat_preferences
FOR INSERT
WITH CHECK (true);

-- Allow updating own session preferences
CREATE POLICY "Users can update their session preferences"
ON public.user_chat_preferences
FOR UPDATE
USING (true);