-- Add email_global_enabled column to admin_settings
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS email_global_enabled BOOLEAN DEFAULT true;