-- Add phone column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Create user_preferences table for individual user settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language text DEFAULT 'pt' CHECK (language IN ('pt', 'en', 'fr')),
  email_notifications boolean DEFAULT true,
  whatsapp_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences" ON public.user_preferences
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_preferences_updated_at();