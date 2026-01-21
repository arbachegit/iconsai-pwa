-- Add tracking fields to user_invitations
ALTER TABLE public.user_invitations 
ADD COLUMN IF NOT EXISTS link_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS form_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_opened_at TIMESTAMP WITH TIME ZONE;

-- Add address fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address_cep TEXT,
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT;

-- Add device info fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_ip_address INET,
ADD COLUMN IF NOT EXISTS last_browser TEXT,
ADD COLUMN IF NOT EXISTS last_os TEXT,
ADD COLUMN IF NOT EXISTS last_device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS last_screen_resolution TEXT,
ADD COLUMN IF NOT EXISTS last_timezone TEXT,
ADD COLUMN IF NOT EXISTS last_language TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS registration_ip_address INET,
ADD COLUMN IF NOT EXISTS registration_browser TEXT,
ADD COLUMN IF NOT EXISTS registration_os TEXT,
ADD COLUMN IF NOT EXISTS registration_device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS registration_location JSONB;

-- Create index for faster lookups on device fingerprint
CREATE INDEX IF NOT EXISTS idx_profiles_device_fingerprint ON public.profiles(last_device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_profiles_last_ip ON public.profiles USING btree (last_ip_address);

-- Create index for invitation tracking queries
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_created_at ON public.user_invitations(created_at DESC);