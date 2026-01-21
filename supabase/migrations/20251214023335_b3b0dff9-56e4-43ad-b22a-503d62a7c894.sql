-- Add API sync configuration columns to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS api_sync_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS api_sync_cron_hour text DEFAULT '03',
ADD COLUMN IF NOT EXISTS api_sync_cron_minute text DEFAULT '00',
ADD COLUMN IF NOT EXISTS api_sync_default_frequency text DEFAULT 'daily';