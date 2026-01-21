-- Fix conversation_history RLS policies to be session-based
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Everyone can read conversations" ON public.conversation_history;
DROP POLICY IF EXISTS "Anyone can insert conversations" ON public.conversation_history;
DROP POLICY IF EXISTS "Anyone can update conversations" ON public.conversation_history;
DROP POLICY IF EXISTS "Anyone can delete conversations" ON public.conversation_history;

-- Create session-based policies using request header
-- Users can only read their own conversations based on session_id header
CREATE POLICY "Users can read own conversations by session"
ON public.conversation_history
FOR SELECT
USING (
  session_id = COALESCE(
    current_setting('request.headers', true)::json->>'x-session-id',
    ''
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Users can only insert conversations with their session_id
CREATE POLICY "Users can insert own conversations"
ON public.conversation_history
FOR INSERT
WITH CHECK (
  session_id = COALESCE(
    current_setting('request.headers', true)::json->>'x-session-id',
    ''
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Users can only update their own conversations
CREATE POLICY "Users can update own conversations by session"
ON public.conversation_history
FOR UPDATE
USING (
  session_id = COALESCE(
    current_setting('request.headers', true)::json->>'x-session-id',
    ''
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Users can only delete their own conversations
CREATE POLICY "Users can delete own conversations by session"
ON public.conversation_history
FOR DELETE
USING (
  session_id = COALESCE(
    current_setting('request.headers', true)::json->>'x-session-id',
    ''
  )
  OR public.has_role(auth.uid(), 'admin')
);