-- Add ai_title and needs_title_review fields to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_title text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS needs_title_review boolean DEFAULT false;