-- First migration: Add superadmin to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'superadmin';