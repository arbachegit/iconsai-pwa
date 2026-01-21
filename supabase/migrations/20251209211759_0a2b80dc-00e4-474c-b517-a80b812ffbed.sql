-- Insert fernando@knowrisk.io as initial superadmin in user_registrations
INSERT INTO public.user_registrations (
  first_name, last_name, email, role, status, requested_at, approved_at
) VALUES (
  'Fernando', 'Admin', 'fernando@knowrisk.io', 
  'superadmin', 'approved', now(), now()
)
ON CONFLICT (email) DO UPDATE SET role = 'superadmin', status = 'approved';

-- Update user_roles to superadmin for existing user
UPDATE public.user_roles 
SET role = 'superadmin' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'fernando@knowrisk.io' LIMIT 1);