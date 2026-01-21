-- Add alert configuration columns to admin_settings table
ALTER TABLE admin_settings
ADD COLUMN alert_email TEXT,
ADD COLUMN alert_enabled BOOLEAN DEFAULT true,
ADD COLUMN alert_threshold DECIMAL(3,2) DEFAULT 0.30;