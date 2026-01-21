
-- =====================================================
-- FASE 1: PWA DEVICES - Tabela Expandida com Segurança
-- =====================================================

-- 1. CRIAR TABELA pwa_devices
CREATE TABLE IF NOT EXISTS public.pwa_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação única do dispositivo
  device_fingerprint TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  
  -- Dados do usuário vinculado
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  
  -- Dados de IP e localização por IP
  ip_address INET,
  ip_country TEXT,
  ip_city TEXT,
  ip_region TEXT,
  ip_isp TEXT,
  
  -- Dados do dispositivo
  device_model TEXT,
  device_vendor TEXT,
  os_name TEXT,
  os_version TEXT,
  browser_name TEXT,
  browser_version TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  pixel_ratio NUMERIC(4,2),
  user_agent TEXT,
  
  -- Localização GPS (com permissão do usuário)
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location_accuracy NUMERIC(10,2),
  location_timestamp TIMESTAMPTZ,
  
  -- Capacidades do dispositivo
  has_touch BOOLEAN DEFAULT true,
  has_camera BOOLEAN DEFAULT false,
  has_microphone BOOLEAN DEFAULT false,
  has_geolocation BOOLEAN DEFAULT false,
  
  -- PWA Access - slugs permitidos
  pwa_slugs TEXT[] DEFAULT '{}',
  
  -- Status de verificação e bloqueio
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_code TEXT,
  verification_expires_at TIMESTAMPTZ,
  
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  blocked_by UUID,
  block_reason TEXT,
  
  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contadores de auditoria
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  failed_verification_attempts INTEGER DEFAULT 0,
  
  -- Metadados extras
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pwa_devices_fingerprint ON public.pwa_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_pwa_devices_phone ON public.pwa_devices(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pwa_devices_user ON public.pwa_devices(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pwa_devices_ip ON public.pwa_devices(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pwa_devices_verified ON public.pwa_devices(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_pwa_devices_blocked ON public.pwa_devices(is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_pwa_devices_last_active ON public.pwa_devices(last_active_at DESC);

-- 2. HABILITAR RLS
ALTER TABLE public.pwa_devices ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES

-- Admins podem gerenciar todos os dispositivos
CREATE POLICY "Admins can manage pwa_devices"
ON public.pwa_devices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Sistema pode inserir dispositivos (para registro público)
CREATE POLICY "System can insert pwa_devices"
ON public.pwa_devices
FOR INSERT
WITH CHECK (true);

-- Dispositivos podem ler seus próprios dados (por fingerprint via RPC)
CREATE POLICY "Public can read own device by fingerprint"
ON public.pwa_devices
FOR SELECT
USING (true);

-- Sistema pode atualizar dispositivos
CREATE POLICY "System can update pwa_devices"
ON public.pwa_devices
FOR UPDATE
USING (true);

-- 4. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_pwa_devices_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pwa_devices_updated_at ON public.pwa_devices;
CREATE TRIGGER trigger_pwa_devices_updated_at
  BEFORE UPDATE ON public.pwa_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pwa_devices_updated_at();

-- 5. FUNÇÃO: verify_pwa_device
-- Verifica se um dispositivo está registrado e retorna seus dados
CREATE OR REPLACE FUNCTION public.verify_pwa_device(
  p_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_result JSONB;
BEGIN
  -- Buscar dispositivo pelo fingerprint
  SELECT 
    id,
    device_fingerprint,
    phone_number,
    user_id,
    user_name,
    user_email,
    pwa_slugs,
    is_verified,
    verified_at,
    is_blocked,
    block_reason,
    first_seen_at,
    last_seen_at,
    total_sessions,
    total_messages
  INTO v_device
  FROM public.pwa_devices
  WHERE device_fingerprint = p_fingerprint
  LIMIT 1;
  
  -- Dispositivo não encontrado
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'status', 'not_registered',
      'message', 'Dispositivo não registrado'
    );
  END IF;
  
  -- Dispositivo bloqueado
  IF v_device.is_blocked = true THEN
    RETURN jsonb_build_object(
      'found', true,
      'status', 'blocked',
      'message', COALESCE(v_device.block_reason, 'Dispositivo bloqueado'),
      'device_id', v_device.id
    );
  END IF;
  
  -- Dispositivo não verificado
  IF v_device.is_verified = false THEN
    RETURN jsonb_build_object(
      'found', true,
      'status', 'pending_verification',
      'message', 'Dispositivo aguardando verificação',
      'device_id', v_device.id,
      'phone_number', v_device.phone_number
    );
  END IF;
  
  -- Dispositivo verificado - atualizar last_seen_at
  UPDATE public.pwa_devices
  SET last_seen_at = NOW()
  WHERE id = v_device.id;
  
  -- Retornar dados completos
  RETURN jsonb_build_object(
    'found', true,
    'status', 'verified',
    'message', 'Dispositivo verificado',
    'device_id', v_device.id,
    'user_id', v_device.user_id,
    'user_name', v_device.user_name,
    'user_email', v_device.user_email,
    'phone_number', v_device.phone_number,
    'pwa_slugs', v_device.pwa_slugs,
    'verified_at', v_device.verified_at,
    'first_seen_at', v_device.first_seen_at,
    'total_sessions', v_device.total_sessions,
    'total_messages', v_device.total_messages
  );
END;
$$;

-- 6. FUNÇÃO: register_pwa_device
-- Registra um novo dispositivo ou atualiza existente
CREATE OR REPLACE FUNCTION public.register_pwa_device(
  p_fingerprint TEXT,
  p_phone_number TEXT DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_ip_country TEXT DEFAULT NULL,
  p_ip_city TEXT DEFAULT NULL,
  p_ip_region TEXT DEFAULT NULL,
  p_ip_isp TEXT DEFAULT NULL,
  p_device_model TEXT DEFAULT NULL,
  p_device_vendor TEXT DEFAULT NULL,
  p_os_name TEXT DEFAULT NULL,
  p_os_version TEXT DEFAULT NULL,
  p_browser_name TEXT DEFAULT NULL,
  p_browser_version TEXT DEFAULT NULL,
  p_screen_width INTEGER DEFAULT NULL,
  p_screen_height INTEGER DEFAULT NULL,
  p_pixel_ratio NUMERIC DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_location_accuracy NUMERIC DEFAULT NULL,
  p_has_touch BOOLEAN DEFAULT true,
  p_has_camera BOOLEAN DEFAULT false,
  p_has_microphone BOOLEAN DEFAULT false,
  p_has_geolocation BOOLEAN DEFAULT false,
  p_pwa_slugs TEXT[] DEFAULT '{}'::TEXT[],
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id UUID;
  v_is_new BOOLEAN := false;
  v_verification_code TEXT;
  v_verification_expires TIMESTAMPTZ;
  v_existing RECORD;
BEGIN
  -- Verificar se dispositivo já existe
  SELECT id, is_verified, is_blocked, block_reason
  INTO v_existing
  FROM public.pwa_devices
  WHERE device_fingerprint = p_fingerprint
  LIMIT 1;
  
  -- Se existe e está bloqueado, não permitir
  IF FOUND AND v_existing.is_blocked = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'blocked',
      'message', COALESCE(v_existing.block_reason, 'Dispositivo bloqueado'),
      'device_id', v_existing.id
    );
  END IF;
  
  -- Se existe e já está verificado, apenas atualizar dados
  IF FOUND AND v_existing.is_verified = true THEN
    UPDATE public.pwa_devices SET
      last_seen_at = NOW(),
      ip_address = COALESCE(p_ip_address::inet, ip_address),
      ip_country = COALESCE(p_ip_country, ip_country),
      ip_city = COALESCE(p_ip_city, ip_city),
      latitude = COALESCE(p_latitude, latitude),
      longitude = COALESCE(p_longitude, longitude),
      location_accuracy = COALESCE(p_location_accuracy, location_accuracy),
      location_timestamp = CASE WHEN p_latitude IS NOT NULL THEN NOW() ELSE location_timestamp END
    WHERE id = v_existing.id
    RETURNING id INTO v_device_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'status', 'already_verified',
      'message', 'Dispositivo já verificado',
      'device_id', v_device_id,
      'is_new', false
    );
  END IF;
  
  -- Gerar código de verificação (6 dígitos)
  v_verification_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  v_verification_expires := NOW() + INTERVAL '10 minutes';
  
  -- Inserir ou atualizar dispositivo
  INSERT INTO public.pwa_devices (
    device_fingerprint,
    phone_number,
    user_name,
    user_email,
    ip_address,
    ip_country,
    ip_city,
    ip_region,
    ip_isp,
    device_model,
    device_vendor,
    os_name,
    os_version,
    browser_name,
    browser_version,
    screen_width,
    screen_height,
    pixel_ratio,
    user_agent,
    latitude,
    longitude,
    location_accuracy,
    location_timestamp,
    has_touch,
    has_camera,
    has_microphone,
    has_geolocation,
    pwa_slugs,
    verification_code,
    verification_expires_at,
    metadata,
    first_seen_at,
    last_seen_at
  ) VALUES (
    p_fingerprint,
    p_phone_number,
    p_user_name,
    p_user_email,
    p_ip_address::inet,
    p_ip_country,
    p_ip_city,
    p_ip_region,
    p_ip_isp,
    p_device_model,
    p_device_vendor,
    p_os_name,
    p_os_version,
    p_browser_name,
    p_browser_version,
    p_screen_width,
    p_screen_height,
    p_pixel_ratio,
    p_user_agent,
    p_latitude,
    p_longitude,
    p_location_accuracy,
    CASE WHEN p_latitude IS NOT NULL THEN NOW() ELSE NULL END,
    p_has_touch,
    p_has_camera,
    p_has_microphone,
    p_has_geolocation,
    p_pwa_slugs,
    v_verification_code,
    v_verification_expires,
    p_metadata,
    NOW(),
    NOW()
  )
  ON CONFLICT (device_fingerprint) DO UPDATE SET
    phone_number = COALESCE(EXCLUDED.phone_number, pwa_devices.phone_number),
    user_name = COALESCE(EXCLUDED.user_name, pwa_devices.user_name),
    user_email = COALESCE(EXCLUDED.user_email, pwa_devices.user_email),
    ip_address = COALESCE(EXCLUDED.ip_address, pwa_devices.ip_address),
    ip_country = COALESCE(EXCLUDED.ip_country, pwa_devices.ip_country),
    ip_city = COALESCE(EXCLUDED.ip_city, pwa_devices.ip_city),
    device_model = COALESCE(EXCLUDED.device_model, pwa_devices.device_model),
    os_name = COALESCE(EXCLUDED.os_name, pwa_devices.os_name),
    os_version = COALESCE(EXCLUDED.os_version, pwa_devices.os_version),
    browser_name = COALESCE(EXCLUDED.browser_name, pwa_devices.browser_name),
    browser_version = COALESCE(EXCLUDED.browser_version, pwa_devices.browser_version),
    user_agent = COALESCE(EXCLUDED.user_agent, pwa_devices.user_agent),
    verification_code = v_verification_code,
    verification_expires_at = v_verification_expires,
    last_seen_at = NOW()
  RETURNING id, (xmax = 0) INTO v_device_id, v_is_new;
  
  RETURN jsonb_build_object(
    'success', true,
    'status', 'pending_verification',
    'message', 'Código de verificação gerado',
    'device_id', v_device_id,
    'is_new', v_is_new,
    'verification_code', v_verification_code,
    'verification_expires_at', v_verification_expires,
    'phone_number', p_phone_number
  );
END;
$$;

-- 7. FUNÇÃO: verify_pwa_device_code
-- Verifica o código SMS e marca dispositivo como verificado
CREATE OR REPLACE FUNCTION public.verify_pwa_device_code(
  p_fingerprint TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
BEGIN
  -- Buscar dispositivo
  SELECT 
    id, 
    verification_code, 
    verification_expires_at,
    is_verified,
    is_blocked,
    failed_verification_attempts
  INTO v_device
  FROM public.pwa_devices
  WHERE device_fingerprint = p_fingerprint
  LIMIT 1;
  
  -- Dispositivo não encontrado
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_not_found',
      'message', 'Dispositivo não encontrado'
    );
  END IF;
  
  -- Já verificado
  IF v_device.is_verified = true THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'message', 'Dispositivo já verificado'
    );
  END IF;
  
  -- Bloqueado
  IF v_device.is_blocked = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_blocked',
      'message', 'Dispositivo bloqueado'
    );
  END IF;
  
  -- Código expirado
  IF v_device.verification_expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'code_expired',
      'message', 'Código expirado'
    );
  END IF;
  
  -- Código incorreto
  IF v_device.verification_code != p_code THEN
    -- Incrementar tentativas falhas
    UPDATE public.pwa_devices
    SET failed_verification_attempts = failed_verification_attempts + 1
    WHERE id = v_device.id;
    
    -- Bloquear após 5 tentativas
    IF v_device.failed_verification_attempts >= 4 THEN
      UPDATE public.pwa_devices
      SET 
        is_blocked = true,
        blocked_at = NOW(),
        block_reason = 'Muitas tentativas de verificação incorretas'
      WHERE id = v_device.id;
      
      RETURN jsonb_build_object(
        'success', false,
        'error', 'device_blocked',
        'message', 'Dispositivo bloqueado por excesso de tentativas'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código incorreto',
      'attempts_remaining', 5 - v_device.failed_verification_attempts - 1
    );
  END IF;
  
  -- Código correto - verificar dispositivo
  UPDATE public.pwa_devices
  SET 
    is_verified = true,
    verified_at = NOW(),
    verification_code = NULL,
    verification_expires_at = NULL,
    failed_verification_attempts = 0,
    total_sessions = total_sessions + 1
  WHERE id = v_device.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Dispositivo verificado com sucesso',
    'device_id', v_device.id
  );
END;
$$;

-- 8. FUNÇÃO: update_device_activity
-- Atualiza atividade do dispositivo (chamado durante uso)
CREATE OR REPLACE FUNCTION public.update_device_activity(
  p_fingerprint TEXT,
  p_increment_messages BOOLEAN DEFAULT false,
  p_new_session BOOLEAN DEFAULT false,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id UUID;
  v_is_verified BOOLEAN;
  v_is_blocked BOOLEAN;
BEGIN
  -- Buscar e atualizar dispositivo
  UPDATE public.pwa_devices
  SET 
    last_active_at = NOW(),
    total_sessions = CASE WHEN p_new_session THEN total_sessions + 1 ELSE total_sessions END,
    total_messages = CASE WHEN p_increment_messages THEN total_messages + 1 ELSE total_messages END,
    latitude = COALESCE(p_latitude, latitude),
    longitude = COALESCE(p_longitude, longitude),
    location_timestamp = CASE WHEN p_latitude IS NOT NULL THEN NOW() ELSE location_timestamp END,
    ip_address = CASE WHEN p_ip_address IS NOT NULL THEN p_ip_address::inet ELSE ip_address END
  WHERE device_fingerprint = p_fingerprint
  RETURNING id, is_verified, is_blocked INTO v_device_id, v_is_verified, v_is_blocked;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_not_found'
    );
  END IF;
  
  IF v_is_blocked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_blocked'
    );
  END IF;
  
  IF NOT v_is_verified THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_not_verified'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'device_id', v_device_id
  );
END;
$$;

-- 9. FUNÇÃO: block_pwa_device
-- Bloqueia um dispositivo (admin only)
CREATE OR REPLACE FUNCTION public.block_pwa_device(
  p_device_id UUID,
  p_reason TEXT DEFAULT 'Bloqueado pelo administrador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pwa_devices
  SET 
    is_blocked = true,
    blocked_at = NOW(),
    blocked_by = auth.uid(),
    block_reason = p_reason
  WHERE id = p_device_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_not_found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Dispositivo bloqueado'
  );
END;
$$;

-- 10. FUNÇÃO: unblock_pwa_device
-- Desbloqueia um dispositivo (admin only)
CREATE OR REPLACE FUNCTION public.unblock_pwa_device(
  p_device_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pwa_devices
  SET 
    is_blocked = false,
    blocked_at = NULL,
    blocked_by = NULL,
    block_reason = NULL,
    failed_verification_attempts = 0
  WHERE id = p_device_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_not_found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Dispositivo desbloqueado'
  );
END;
$$;

-- 11. FUNÇÃO: get_pwa_device_stats
-- Retorna estatísticas de dispositivos PWA (admin only)
CREATE OR REPLACE FUNCTION public.get_pwa_device_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_devices', COUNT(*),
    'verified_devices', COUNT(*) FILTER (WHERE is_verified = true),
    'blocked_devices', COUNT(*) FILTER (WHERE is_blocked = true),
    'pending_verification', COUNT(*) FILTER (WHERE is_verified = false AND is_blocked = false),
    'active_today', COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '24 hours'),
    'active_week', COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '7 days'),
    'total_sessions', COALESCE(SUM(total_sessions), 0),
    'total_messages', COALESCE(SUM(total_messages), 0)
  ) INTO v_stats
  FROM public.pwa_devices;
  
  RETURN v_stats;
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE public.pwa_devices IS 'Dispositivos PWA registrados com dados de segurança expandidos';
COMMENT ON FUNCTION public.verify_pwa_device IS 'Verifica se um dispositivo está registrado e retorna status';
COMMENT ON FUNCTION public.register_pwa_device IS 'Registra novo dispositivo ou atualiza existente';
COMMENT ON FUNCTION public.verify_pwa_device_code IS 'Verifica código SMS e marca dispositivo como verificado';
COMMENT ON FUNCTION public.update_device_activity IS 'Atualiza atividade do dispositivo durante uso';
COMMENT ON FUNCTION public.block_pwa_device IS 'Bloqueia um dispositivo (admin)';
COMMENT ON FUNCTION public.unblock_pwa_device IS 'Desbloqueia um dispositivo (admin)';
COMMENT ON FUNCTION public.get_pwa_device_stats IS 'Retorna estatísticas de dispositivos PWA';
