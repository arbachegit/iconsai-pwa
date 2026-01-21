-- Add ML accuracy alert fields to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS ml_accuracy_threshold numeric DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS ml_accuracy_alert_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ml_accuracy_alert_email text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ml_accuracy_last_alert timestamp with time zone DEFAULT NULL;