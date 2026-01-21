-- ============================================
-- PART 1: Create profiles table (WITHOUT role column - roles stay in user_roles!)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  avatar_url text,
  institution_work text,
  institution_study text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_profiles_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_timestamp();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Create user_contacts table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('email', 'phone', 'whatsapp')),
  value text NOT NULL,
  is_primary boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (type, value)
);

CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id ON public.user_contacts(user_id);
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: RLS Policies for profiles
-- ============================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Admins/Superadmins can view ALL profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Superadmin can update ANY profile
CREATE POLICY "Superadmin can update any profile" ON public.profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Users can update their OWN profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- PART 4: RLS Policies for user_contacts
-- ============================================
DROP POLICY IF EXISTS "Admins can view all contacts" ON public.user_contacts;
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.user_contacts;

-- Admins can view ALL contacts
CREATE POLICY "Admins can view all contacts" ON public.user_contacts
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Users can fully manage their OWN contacts (CRUD)
CREATE POLICY "Users can manage own contacts" ON public.user_contacts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 5: Role Protection Trigger (prevents self-escalation)
-- ============================================
CREATE OR REPLACE FUNCTION public.protect_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only superadmin can change roles
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Only superadmin can change user roles';
    END IF;
  END IF;
  
  -- Superadmin cannot demote themselves
  IF NEW.user_id = auth.uid() AND OLD.role = 'superadmin'::app_role AND NEW.role != 'superadmin'::app_role THEN
    RAISE EXCEPTION 'Cannot demote yourself from superadmin';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_role_updates ON public.user_roles;
CREATE TRIGGER protect_role_updates
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_role_changes();

-- ============================================
-- PART 6: Seed the superadmin profile
-- ============================================
INSERT INTO public.profiles (id, first_name, last_name)
SELECT id, 
  COALESCE(raw_user_meta_data->>'first_name', 'Fernando'),
  COALESCE(raw_user_meta_data->>'last_name', 'Admin')
FROM auth.users
WHERE email = 'fernando@knowrisk.io'
ON CONFLICT (id) DO UPDATE SET 
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = now();