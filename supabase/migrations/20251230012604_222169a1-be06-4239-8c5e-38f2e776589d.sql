-- Add is_read column to notification_logs for tracking read status
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Mark all existing notifications as read
UPDATE notification_logs SET is_read = true WHERE is_read IS NULL OR is_read = false;