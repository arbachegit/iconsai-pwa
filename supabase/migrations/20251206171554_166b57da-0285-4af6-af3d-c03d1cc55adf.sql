-- Fix 1: Password Recovery Codes - Remove public SELECT, add service role only
-- Current policy "System can read recovery codes" has qual=true allowing anyone to read

DROP POLICY IF EXISTS "System can read recovery codes" ON password_recovery_codes;

-- Service role access is inherent (bypasses RLS), so we don't need an explicit policy
-- The edge functions use service role key, so they can still read codes

-- Fix 2: User Activity Logs - Restrict INSERT to authenticated users only
-- Current policy "System can insert activity logs" has with_check=true for public role

DROP POLICY IF EXISTS "System can insert activity logs" ON user_activity_logs;

CREATE POLICY "Authenticated users can insert activity logs"
ON user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);