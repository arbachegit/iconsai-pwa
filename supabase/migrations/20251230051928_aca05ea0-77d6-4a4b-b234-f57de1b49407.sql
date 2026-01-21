-- Fix the complete_pwa_registration_with_code function to use device_fingerprint instead of device_id
CREATE OR REPLACE FUNCTION public.complete_pwa_registration_with_code(
  p_invitation_token text, 
  p_device_id text, 
  p_verification_code text, 
  p_user_agent text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation record;
  v_device record;
  v_session record;
  v_session_token text;
  v_result jsonb;
BEGIN
  -- Find invitation with verification_sent status
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_invitation_token
    AND status = 'verification_sent'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite não encontrado ou não está aguardando verificação'
    );
  END IF;

  -- Check code expiration
  IF v_invitation.verification_code_expires_at IS NOT NULL 
     AND v_invitation.verification_code_expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Código de verificação expirado. Solicite um novo código.'
    );
  END IF;

  -- Verify code
  IF v_invitation.verification_code IS NULL 
     OR v_invitation.verification_code != p_verification_code THEN
    -- Increment attempts
    UPDATE user_invitations 
    SET verification_attempts = COALESCE(verification_attempts, 0) + 1
    WHERE id = v_invitation.id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Código de verificação inválido'
    );
  END IF;

  -- Code is valid - complete registration
  
  -- 1. Mark invitation as completed
  UPDATE user_invitations
  SET 
    status = 'completed',
    completed_at = now()
  WHERE id = v_invitation.id;

  -- 2. Create or update pwa_device using device_fingerprint (FIXED!)
  INSERT INTO pwa_devices (device_fingerprint, user_agent, is_verified, verified_at, user_name, user_email, phone_number)
  VALUES (p_device_id, p_user_agent, true, now(), v_invitation.name, v_invitation.email, v_invitation.phone)
  ON CONFLICT (device_fingerprint) DO UPDATE SET
    user_agent = COALESCE(EXCLUDED.user_agent, pwa_devices.user_agent),
    is_verified = true,
    verified_at = now(),
    user_name = COALESCE(EXCLUDED.user_name, pwa_devices.user_name),
    user_email = COALESCE(EXCLUDED.user_email, pwa_devices.user_email),
    phone_number = COALESCE(EXCLUDED.phone_number, pwa_devices.phone_number),
    updated_at = now()
  RETURNING * INTO v_device;

  -- 3. Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- 4. Create pwa_session (uses device_id column as expected by pwa_sessions table)
  INSERT INTO pwa_sessions (
    device_id,
    user_name,
    token,
    is_active,
    has_app_access,
    pwa_access,
    expires_at
  )
  VALUES (
    p_device_id,
    v_invitation.name,
    v_session_token,
    true,
    true,
    v_invitation.pwa_access,
    now() + interval '30 days'
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    token = EXCLUDED.token,
    is_active = true,
    has_app_access = true,
    pwa_access = EXCLUDED.pwa_access,
    expires_at = EXCLUDED.expires_at,
    last_interaction = now()
  RETURNING * INTO v_session;

  -- 5. Clear verification code
  UPDATE user_invitations
  SET 
    verification_code = NULL,
    verification_code_expires_at = NULL,
    verification_attempts = 0
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cadastro realizado com sucesso!',
    'session_token', v_session_token,
    'user_name', v_invitation.name,
    'pwa_access', v_invitation.pwa_access
  );
END;
$function$;

-- Create invitation_channel_audit table for tracking channel rule changes
CREATE TABLE IF NOT EXISTS public.invitation_channel_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid REFERENCES user_invitations(id) ON DELETE SET NULL,
  invitation_token text,
  action text NOT NULL,
  actor_user_id uuid,
  old_values jsonb,
  new_values jsonb,
  computed_policy jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on invitation_channel_audit
ALTER TABLE public.invitation_channel_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitation_channel_audit
CREATE POLICY "Admins can manage invitation_channel_audit" ON public.invitation_channel_audit
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert invitation_channel_audit" ON public.invitation_channel_audit
FOR INSERT WITH CHECK (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_invitation_channel_audit_invitation ON public.invitation_channel_audit(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_channel_audit_created ON public.invitation_channel_audit(created_at DESC);

-- Create trigger function to enforce PWA = WhatsApp only rule
CREATE OR REPLACE FUNCTION public.enforce_invitation_channel_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- RULE: PWA-only invitations MUST use WhatsApp, NOT Email
  IF NEW.has_app_access = true AND (NEW.has_platform_access IS NULL OR NEW.has_platform_access = false) THEN
    -- Force WhatsApp, block Email
    NEW.send_via_email := false;
    NEW.send_via_whatsapp := true;
    
    -- Require phone for PWA-only
    IF NEW.phone IS NULL OR trim(NEW.phone) = '' THEN
      RAISE EXCEPTION 'Telefone é obrigatório para convites de APP. Convites de APP são enviados exclusivamente via WhatsApp.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to enforce rules before insert/update
DROP TRIGGER IF EXISTS enforce_invitation_channel_rules_trigger ON user_invitations;
CREATE TRIGGER enforce_invitation_channel_rules_trigger
  BEFORE INSERT OR UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_invitation_channel_rules();

-- Create trigger function to audit invitation changes
CREATE OR REPLACE FUNCTION public.audit_invitation_channel_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_action text;
  v_old_values jsonb;
  v_new_values jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_old_values := NULL;
  ELSE
    v_action := 'update';
    v_old_values := jsonb_build_object(
      'has_platform_access', OLD.has_platform_access,
      'has_app_access', OLD.has_app_access,
      'send_via_email', OLD.send_via_email,
      'send_via_whatsapp', OLD.send_via_whatsapp,
      'phone', OLD.phone,
      'status', OLD.status
    );
  END IF;
  
  v_new_values := jsonb_build_object(
    'has_platform_access', NEW.has_platform_access,
    'has_app_access', NEW.has_app_access,
    'send_via_email', NEW.send_via_email,
    'send_via_whatsapp', NEW.send_via_whatsapp,
    'phone', NEW.phone,
    'status', NEW.status
  );
  
  -- Only log if relevant fields changed or on insert
  IF TG_OP = 'INSERT' OR 
     OLD.has_platform_access IS DISTINCT FROM NEW.has_platform_access OR
     OLD.has_app_access IS DISTINCT FROM NEW.has_app_access OR
     OLD.send_via_email IS DISTINCT FROM NEW.send_via_email OR
     OLD.send_via_whatsapp IS DISTINCT FROM NEW.send_via_whatsapp OR
     OLD.status IS DISTINCT FROM NEW.status THEN
    
    INSERT INTO invitation_channel_audit (
      invitation_id,
      invitation_token,
      action,
      actor_user_id,
      old_values,
      new_values,
      computed_policy
    ) VALUES (
      NEW.id,
      NEW.token,
      v_action,
      auth.uid(),
      v_old_values,
      v_new_values,
      jsonb_build_object(
        'pwa_only', NEW.has_app_access = true AND (NEW.has_platform_access IS NULL OR NEW.has_platform_access = false),
        'enforced_whatsapp', NEW.has_app_access = true AND (NEW.has_platform_access IS NULL OR NEW.has_platform_access = false)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_invitation_channel_changes_trigger ON user_invitations;
CREATE TRIGGER audit_invitation_channel_changes_trigger
  AFTER INSERT OR UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION audit_invitation_channel_changes();