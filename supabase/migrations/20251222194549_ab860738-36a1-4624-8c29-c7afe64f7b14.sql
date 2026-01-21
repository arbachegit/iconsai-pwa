-- ============================================
-- FIX: conversation_history - Remove insecure HTTP header-based RLS policies
-- Replace with admin-only access (chat history is for analytics)
-- Service role (edge functions) can still insert/update for chat functionality
-- ============================================

-- Drop existing insecure session-based policies
DROP POLICY IF EXISTS "Users can delete own conversations by session" ON public.conversation_history;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversation_history;
DROP POLICY IF EXISTS "Users can read own conversations by session" ON public.conversation_history;
DROP POLICY IF EXISTS "Users can update own conversations by session" ON public.conversation_history;

-- Keep existing admin policy if it exists, or create it
DROP POLICY IF EXISTS "Admins can read all conversations" ON public.conversation_history;

-- Create secure policies

-- SELECT: Only admins/superadmins can read conversation history
CREATE POLICY "Admins can read all conversations"
ON public.conversation_history
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- INSERT: Service role (edge functions via supabase admin client) or admins
-- auth.jwt() IS NULL indicates service role bypassing RLS
CREATE POLICY "Service role or admins can insert conversations"
ON public.conversation_history
FOR INSERT
WITH CHECK (
  auth.jwt() IS NULL OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- UPDATE: Service role or admins can update
CREATE POLICY "Service role or admins can update conversations"
ON public.conversation_history
FOR UPDATE
USING (
  auth.jwt() IS NULL OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- DELETE: Only superadmins can delete conversation history
CREATE POLICY "Superadmins can delete conversations"
ON public.conversation_history
FOR DELETE
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
);