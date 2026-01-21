-- Drop existing permissive policies
DROP POLICY IF EXISTS "Service role can manage summaries" ON pwa_conversation_summaries;
DROP POLICY IF EXISTS "Allow all operations for pwa_user_context" ON pwa_user_context;

-- Create secure service_role only policies
CREATE POLICY "Service role full access" ON pwa_conversation_summaries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON pwa_user_context
  FOR ALL USING (auth.role() = 'service_role');