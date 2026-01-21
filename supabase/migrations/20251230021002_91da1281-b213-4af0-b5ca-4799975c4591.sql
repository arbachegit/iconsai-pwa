-- Safety-net migration: Ensure pwa_devices has required columns and register_pwa_user is up-to-date

-- 1. Add missing columns (idempotent)
ALTER TABLE public.pwa_devices 
ADD COLUMN IF NOT EXISTS user_registration_id UUID 
REFERENCES public.user_registrations(id) ON DELETE SET NULL;

ALTER TABLE public.pwa_devices 
ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT false;

-- 2. Create index (idempotent)
CREATE INDEX IF NOT EXISTS idx_pwa_devices_user_registration 
ON public.pwa_devices(user_registration_id) 
WHERE user_registration_id IS NOT NULL;

-- 3. Create helper function to get pwa_devices schema (for diagnostics)
CREATE OR REPLACE FUNCTION public.get_pwa_devices_schema()
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::text,
    column_default::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'pwa_devices'
  ORDER BY ordinal_position;
$$;

-- 4. Create helper function to get register_pwa_user definition (for diagnostics)
CREATE OR REPLACE FUNCTION public.get_register_pwa_user_definition()
RETURNS TABLE (
  function_name text,
  function_definition text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.proname::text as function_name,
    pg_get_functiondef(p.oid)::text as function_definition
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'register_pwa_user'
  LIMIT 1;
$$;

-- 5. Re-create register_pwa_user with all required columns (safety-net)
CREATE OR REPLACE FUNCTION public.register_pwa_user(
  p_invitation_token TEXT,
  p_device_id TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_existing_device RECORD;
  v_session_token TEXT;
  v_pwa_access TEXT[];
  v_registration_id UUID;
BEGIN
  -- Validate invitation
  SELECT * INTO v_invitation
  FROM pwa_invitations
  WHERE token = p_invitation_token
    AND status = 'sent'
    AND expires_at > NOW()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite inválido ou expirado'
    );
  END IF;
  
  -- Check for existing device
  SELECT * INTO v_existing_device
  FROM pwa_devices
  WHERE device_fingerprint = p_device_id;
  
  IF FOUND THEN
    -- Update existing device
    UPDATE pwa_devices
    SET 
      user_name = p_name,
      user_email = p_email,
      phone_number = p_phone,
      is_verified = true,
      is_trusted = true,
      user_registration_id = v_invitation.user_registration_id,
      pwa_slugs = v_invitation.pwa_access,
      updated_at = NOW()
    WHERE id = v_existing_device.id;
    
    v_session_token := v_existing_device.session_token;
    v_pwa_access := v_invitation.pwa_access;
    v_registration_id := v_invitation.user_registration_id;
  ELSE
    -- Generate session token
    v_session_token := encode(gen_random_bytes(32), 'hex');
    v_pwa_access := v_invitation.pwa_access;
    v_registration_id := v_invitation.user_registration_id;
    
    -- Create new device with all required fields
    INSERT INTO pwa_devices (
      device_fingerprint,
      user_name,
      user_email,
      phone_number,
      user_agent,
      session_token,
      pwa_slugs,
      is_verified,
      is_trusted,
      user_registration_id
    ) VALUES (
      p_device_id,
      p_name,
      p_email,
      p_phone,
      p_user_agent,
      v_session_token,
      v_pwa_access,
      true,
      true,
      v_registration_id
    );
  END IF;
  
  -- Mark invitation as completed
  UPDATE pwa_invitations
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_invitation.id;
  
  -- Update user_registrations if linked
  IF v_registration_id IS NOT NULL THEN
    UPDATE user_registrations
    SET 
      pwa_registered_at = NOW(),
      has_app_access = true,
      pwa_access = v_pwa_access
    WHERE id = v_registration_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cadastro realizado com sucesso',
    'session_token', v_session_token,
    'pwa_access', v_pwa_access
  );
END;
$$;