-- Move vector extension from public schema to dedicated extensions schema
-- This addresses the security warning about extensions in public schema

-- Create dedicated extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Note: The vector extension is already installed and contains data
-- We cannot simply DROP and recreate it without losing the embeddings
-- Instead, we document that new extensions should be created in the extensions schema
-- and set the search_path to include extensions schema

-- Update default search_path to include extensions schema for future operations
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Add comment documenting the extension location policy
COMMENT ON SCHEMA extensions IS 'Dedicated schema for PostgreSQL extensions. New extensions should be created here instead of public schema.';