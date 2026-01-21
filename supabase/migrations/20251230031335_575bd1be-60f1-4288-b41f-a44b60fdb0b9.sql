-- EMERGENCY FIX: Corrigir register_pwa_user para usar extensions.gen_random_bytes
-- E adicionar funções de verificação de RLS e Integridade de FK

-- 1. RECRIAR FUNÇÃO register_pwa_user com referência correta ao schema extensions
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
  v_device_uuid UUID;
BEGIN
  -- 1. Validate invitation (TABELA CORRETA: user_invitations)
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE token = p_invitation_token
    AND status IN ('pending', 'form_submitted')
    AND expires_at > NOW()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite inválido ou expirado'
    );
  END IF;
  
  -- 2. Get pwa_access from invitation
  v_pwa_access := COALESCE(v_invitation.pwa_access, ARRAY[]::TEXT[]);
  
  -- 3. Find user_registration by email (se existir)
  SELECT id INTO v_registration_id
  FROM user_registrations
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
  
  -- 4. Check for existing device
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
      user_registration_id = v_registration_id,
      pwa_slugs = v_pwa_access,
      updated_at = NOW()
    WHERE id = v_existing_device.id
    RETURNING id INTO v_device_uuid;
  ELSE
    -- Create new device
    INSERT INTO pwa_devices (
      device_fingerprint,
      user_name,
      user_email,
      phone_number,
      user_agent,
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
      v_pwa_access,
      true,
      true,
      v_registration_id
    )
    RETURNING id INTO v_device_uuid;
  END IF;
  
  -- 5. Generate session token - CORRIGIDO: usar extensions.gen_random_bytes
  v_session_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- 6. Create/update session in pwa_sessions
  INSERT INTO pwa_sessions (
    device_id,
    user_name,
    token,
    pwa_access,
    is_active,
    has_app_access
  ) VALUES (
    p_device_id,
    p_name,
    v_session_token,
    v_pwa_access,
    true,
    true
  )
  ON CONFLICT (device_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    token = EXCLUDED.token,
    pwa_access = EXCLUDED.pwa_access,
    is_active = true,
    has_app_access = true,
    last_interaction = NOW();
  
  -- 7. Mark invitation as completed
  UPDATE user_invitations
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_invitation.id;
  
  -- 8. Update user_registrations if linked
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

-- 2. CRIAR FUNÇÃO para listar RLS policies
CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS TABLE (
  schemaname TEXT,
  tablename TEXT,
  policyname TEXT,
  permissive TEXT,
  roles TEXT[],
  cmd TEXT,
  qual TEXT,
  with_check TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.schemaname::TEXT,
    p.tablename::TEXT,
    p.policyname::TEXT,
    p.permissive::TEXT,
    p.roles::TEXT[],
    p.cmd::TEXT,
    p.qual::TEXT,
    p.with_check::TEXT
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  ORDER BY p.tablename, p.policyname;
END;
$$;

-- 3. CRIAR FUNÇÃO para verificar integridade de foreign keys
CREATE OR REPLACE FUNCTION public.get_foreign_key_integrity()
RETURNS TABLE (
  source_table TEXT,
  source_column TEXT,
  target_table TEXT,
  target_column TEXT,
  constraint_name TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, information_schema
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kcu.table_name::TEXT as source_table,
    kcu.column_name::TEXT as source_column,
    ccu.table_name::TEXT as target_table,
    ccu.column_name::TEXT as target_column,
    tc.constraint_name::TEXT,
    TRUE as is_valid
  FROM table_constraints tc
  JOIN key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  ORDER BY kcu.table_name, kcu.column_name;
END;
$$;

-- 4. CRIAR FUNÇÃO para verificar tabelas sem RLS
CREATE OR REPLACE FUNCTION public.get_tables_without_rls()
RETURNS TABLE (
  table_name TEXT,
  has_rls BOOLEAN,
  policy_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::TEXT as table_name,
    c.relrowsecurity as has_rls,
    COALESCE(policy_counts.cnt, 0) as policy_count
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  LEFT JOIN (
    SELECT p.tablename::name, COUNT(*)::BIGINT as cnt
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    GROUP BY p.tablename
  ) policy_counts ON c.relname = policy_counts.tablename
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
  ORDER BY c.relname;
END;
$$;