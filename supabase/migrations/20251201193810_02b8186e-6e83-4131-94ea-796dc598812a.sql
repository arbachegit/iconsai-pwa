-- Add vimeo_history_url column to admin_settings table
ALTER TABLE admin_settings 
ADD COLUMN vimeo_history_url TEXT;