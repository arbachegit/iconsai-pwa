-- Add implementation_status column to documents table
ALTER TABLE documents 
ADD COLUMN implementation_status TEXT;