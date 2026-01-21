-- Add documentation sync configuration columns to admin_settings
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS doc_sync_time TEXT DEFAULT '03:00',
ADD COLUMN IF NOT EXISTS doc_sync_alert_email TEXT;