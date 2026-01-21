-- Fix overly permissive policy on user_chat_preferences
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Users can read their session preferences" ON public.user_chat_preferences;

-- Create a more restrictive policy that only allows users to read their own session preferences
-- Using session_id matching from request headers (same pattern as conversation_history)
CREATE POLICY "Users can read own session preferences"
ON public.user_chat_preferences
FOR SELECT
USING (
  session_id = COALESCE(
    ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text),
    ''::text
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);