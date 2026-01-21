-- ============================================================
-- KNOWRISK - SCRIPT DE MIGRAÇÃO COMPLETO
-- Parte 2: Funções e Stored Procedures
-- Gerado em: 2026-01-13
-- ============================================================

-- ============================================================
-- FUNÇÕES DE UTILIDADE
-- ============================================================

-- Função para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, check_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = has_role.user_id
    AND user_roles.role = check_role
  );
END;
$$;

-- Função para obter roles do usuário
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id UUID)
RETURNS app_role[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  roles app_role[];
BEGIN
  SELECT array_agg(role) INTO roles
  FROM user_roles
  WHERE user_roles.user_id = get_user_roles.user_id;
  
  RETURN COALESCE(roles, ARRAY[]::app_role[]);
END;
$$;

-- ============================================================
-- FUNÇÕES DE BUSCA SEMÂNTICA
-- ============================================================

-- Busca de documentos por similaridade
CREATE OR REPLACE FUNCTION public.search_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_chat_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  filename TEXT,
  target_chat TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.filename,
    d.target_chat
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    dc.embedding IS NOT NULL
    AND d.status = 'processed'
    AND (filter_chat_type IS NULL OR d.target_chat = filter_chat_type)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Busca em deep_search_knowledge
CREATE OR REPLACE FUNCTION public.search_knowledge(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  query TEXT,
  answer TEXT,
  similarity FLOAT,
  source_type TEXT,
  source_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dsk.id,
    dsk.query,
    dsk.answer,
    1 - (dsk.embedding <=> query_embedding) AS similarity,
    dsk.source_type,
    dsk.source_name
  FROM deep_search_knowledge dsk
  WHERE 
    dsk.embedding IS NOT NULL
    AND 1 - (dsk.embedding <=> query_embedding) > match_threshold
  ORDER BY dsk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- FUNÇÕES DE TAXONOMIA
-- ============================================================

-- Aplicar taxonomia em lote
CREATE OR REPLACE FUNCTION public.apply_batch_taxonomy(p_batch JSONB)
RETURNS TABLE(success_count INTEGER, error_count INTEGER, errors JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_doc_id UUID;
  v_taxonomy_code TEXT;
  v_taxonomy_id UUID;
  v_source TEXT;
  v_confidence NUMERIC;
  v_success INTEGER := 0;
  v_errors INTEGER := 0;
  v_error_list JSONB := '[]'::jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_batch)
  LOOP
    BEGIN
      v_doc_id := (v_item->>'document_id')::UUID;
      v_source := COALESCE(v_item->>'source', 'manual');
      v_confidence := COALESCE((v_item->>'confidence')::NUMERIC, 1.0);
      
      FOR v_taxonomy_code IN SELECT * FROM jsonb_array_elements_text(v_item->'taxonomy_codes')
      LOOP
        SELECT id INTO v_taxonomy_id
        FROM global_taxonomy
        WHERE code = v_taxonomy_code;
        
        IF v_taxonomy_id IS NULL THEN
          v_errors := v_errors + 1;
          v_error_list := v_error_list || jsonb_build_object(
            'document_id', v_doc_id,
            'taxonomy_code', v_taxonomy_code,
            'error', 'Taxonomy code not found'
          );
          CONTINUE;
        END IF;
        
        INSERT INTO entity_tags (entity_id, entity_type, taxonomy_id, source, confidence)
        VALUES (v_doc_id, 'document', v_taxonomy_id, v_source, v_confidence)
        ON CONFLICT (entity_type, entity_id, taxonomy_id) 
        DO UPDATE SET 
          confidence = GREATEST(entity_tags.confidence, EXCLUDED.confidence),
          source = CASE 
            WHEN EXCLUDED.confidence > entity_tags.confidence THEN EXCLUDED.source 
            ELSE entity_tags.source 
          END;
        
        v_success := v_success + 1;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_error_list := v_error_list || jsonb_build_object(
        'document_id', v_item->>'document_id',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_success, v_errors, v_error_list;
END;
$$;

-- Obter taxonomias de um documento
CREATE OR REPLACE FUNCTION public.get_document_taxonomies(p_document_id UUID)
RETURNS TABLE(
  taxonomy_id UUID,
  code TEXT,
  name TEXT,
  confidence NUMERIC,
  source TEXT,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gt.id AS taxonomy_id,
    gt.code,
    gt.name,
    et.confidence,
    et.source,
    et.is_primary
  FROM entity_tags et
  JOIN global_taxonomy gt ON et.taxonomy_id = gt.id
  WHERE et.entity_id = p_document_id
    AND et.entity_type = 'document'
  ORDER BY et.is_primary DESC, et.confidence DESC;
END;
$$;

-- Obter árvore de taxonomia
CREATE OR REPLACE FUNCTION public.get_taxonomy_tree(p_root_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  code TEXT,
  name TEXT,
  parent_id UUID,
  level INTEGER,
  path TEXT[],
  children_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE taxonomy_tree AS (
    SELECT
      gt.id,
      gt.code,
      gt.name,
      gt.parent_id,
      gt.level,
      ARRAY[gt.code] AS path
    FROM global_taxonomy gt
    WHERE (p_root_id IS NULL AND gt.parent_id IS NULL)
       OR (p_root_id IS NOT NULL AND gt.id = p_root_id)
    
    UNION ALL
    
    SELECT
      child.id,
      child.code,
      child.name,
      child.parent_id,
      child.level,
      tree.path || child.code
    FROM global_taxonomy child
    JOIN taxonomy_tree tree ON child.parent_id = tree.id
  )
  SELECT
    tt.id,
    tt.code,
    tt.name,
    tt.parent_id,
    tt.level,
    tt.path,
    (SELECT COUNT(*) FROM global_taxonomy g WHERE g.parent_id = tt.id) AS children_count
  FROM taxonomy_tree tt
  ORDER BY tt.path;
END;
$$;

-- ============================================================
-- FUNÇÕES DE SUGESTÕES ML
-- ============================================================

-- Aprovar sugestão de tag
CREATE OR REPLACE FUNCTION public.approve_tag_suggestion(
  p_suggestion_id UUID,
  p_reviewer_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion RECORD;
  v_entity_tag_id UUID;
BEGIN
  SELECT * INTO v_suggestion
  FROM ml_tag_suggestions
  WHERE id = p_suggestion_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Suggestion not found');
  END IF;
  
  IF v_suggestion.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Suggestion is not pending');
  END IF;
  
  UPDATE ml_tag_suggestions
  SET 
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    reviewer_notes = p_notes
  WHERE id = p_suggestion_id;
  
  INSERT INTO entity_tags (entity_id, entity_type, taxonomy_id, source, confidence, is_primary)
  VALUES (v_suggestion.document_id, 'document', v_suggestion.taxonomy_id, 'manual', v_suggestion.confidence, false)
  ON CONFLICT (entity_id, entity_type, taxonomy_id) DO UPDATE
  SET confidence = EXCLUDED.confidence, source = 'manual'
  RETURNING id INTO v_entity_tag_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'entity_tag_id', v_entity_tag_id,
    'message', 'Suggestion approved successfully'
  );
END;
$$;

-- Rejeitar sugestão de tag
CREATE OR REPLACE FUNCTION public.reject_tag_suggestion(
  p_suggestion_id UUID,
  p_reviewer_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ml_tag_suggestions
  SET 
    status = 'rejected',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    reviewer_notes = p_notes
  WHERE id = p_suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Suggestion not found or already processed');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Suggestion rejected');
END;
$$;

-- ============================================================
-- FUNÇÕES DE PWA
-- ============================================================

-- Criar ou atualizar sessão PWA
CREATE OR REPLACE FUNCTION public.upsert_pwa_session(
  p_phone TEXT,
  p_device_fingerprint TEXT,
  p_session_token TEXT,
  p_device_info JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_device_id UUID;
  v_session_id UUID;
BEGIN
  -- Buscar ou criar usuário
  SELECT id INTO v_user_id FROM pwa_users WHERE phone = p_phone;
  
  IF v_user_id IS NULL THEN
    INSERT INTO pwa_users (phone) VALUES (p_phone) RETURNING id INTO v_user_id;
  END IF;
  
  -- Buscar ou criar dispositivo
  INSERT INTO pwa_user_devices (phone, device_fingerprint, device_info)
  VALUES (p_phone, p_device_fingerprint, p_device_info)
  ON CONFLICT (phone, device_fingerprint) DO UPDATE
  SET last_used_at = now(), device_info = EXCLUDED.device_info
  RETURNING id INTO v_device_id;
  
  -- Invalidar sessões anteriores
  UPDATE pwa_sessions 
  SET is_active = false 
  WHERE phone = p_phone AND is_active = true;
  
  -- Criar nova sessão
  INSERT INTO pwa_sessions (user_id, phone, device_id, session_token, expires_at)
  VALUES (v_user_id, p_phone, v_device_id, p_session_token, now() + interval '30 days')
  RETURNING id INTO v_session_id;
  
  -- Atualizar último login
  UPDATE pwa_users 
  SET last_login_at = now(), login_count = login_count + 1 
  WHERE id = v_user_id;
  
  RETURN v_session_id;
END;
$$;

-- Validar sessão PWA
CREATE OR REPLACE FUNCTION public.validate_pwa_session(p_session_token TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  user_id UUID,
  phone TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (s.is_active AND s.expires_at > now()) AS is_valid,
    s.user_id,
    s.phone,
    u.full_name
  FROM pwa_sessions s
  LEFT JOIN pwa_users u ON s.user_id = u.id
  WHERE s.session_token = p_session_token;
END;
$$;

-- ============================================================
-- FUNÇÕES DE ESTATÍSTICAS
-- ============================================================

-- Estatísticas de documentos por chat
CREATE OR REPLACE FUNCTION public.get_document_stats_by_chat()
RETURNS TABLE(
  chat_type TEXT,
  total_documents BIGINT,
  processed_documents BIGINT,
  total_chunks BIGINT,
  avg_words_per_document NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.target_chat AS chat_type,
    COUNT(DISTINCT d.id) AS total_documents,
    COUNT(DISTINCT CASE WHEN d.status = 'processed' THEN d.id END) AS processed_documents,
    COUNT(dc.id) AS total_chunks,
    ROUND(AVG(d.total_words), 2) AS avg_words_per_document
  FROM documents d
  LEFT JOIN document_chunks dc ON d.id = dc.document_id
  GROUP BY d.target_chat
  ORDER BY total_documents DESC;
END;
$$;

-- Estatísticas de taxonomia
CREATE OR REPLACE FUNCTION public.get_taxonomy_usage_stats()
RETURNS TABLE(
  taxonomy_id UUID,
  code TEXT,
  name TEXT,
  document_count BIGINT,
  total_confidence NUMERIC,
  avg_confidence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gt.id AS taxonomy_id,
    gt.code,
    gt.name,
    COUNT(et.id) AS document_count,
    SUM(et.confidence) AS total_confidence,
    ROUND(AVG(et.confidence), 3) AS avg_confidence
  FROM global_taxonomy gt
  LEFT JOIN entity_tags et ON gt.id = et.taxonomy_id AND et.entity_type = 'document'
  GROUP BY gt.id, gt.code, gt.name
  HAVING COUNT(et.id) > 0
  ORDER BY document_count DESC;
END;
$$;

-- ============================================================
-- FUNÇÕES DE ATUALIZAÇÃO
-- ============================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger para proteger alterações de role
CREATE OR REPLACE FUNCTION public.protect_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'superadmin' AND NEW.role != 'superadmin' THEN
    RAISE EXCEPTION 'Cannot demote superadmin role';
  END IF;
  RETURN NEW;
END;
$$;

-- Função para atualizar contagem de chunks
CREATE OR REPLACE FUNCTION public.update_document_chunk_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE documents 
    SET total_chunks = (SELECT COUNT(*) FROM document_chunks WHERE document_id = NEW.document_id)
    WHERE id = NEW.document_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE documents 
    SET total_chunks = (SELECT COUNT(*) FROM document_chunks WHERE document_id = OLD.document_id)
    WHERE id = OLD.document_id;
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================================
-- FUNÇÕES DE AUDITORIA
-- ============================================================

-- Registrar ação de auditoria
CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, old_values, new_values)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_old_values, p_new_values)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ============================================================
-- FUNÇÕES DE INDICADORES
-- ============================================================

-- Obter últimos valores de indicadores
CREATE OR REPLACE FUNCTION public.get_latest_indicator_values(p_codes TEXT[] DEFAULT NULL)
RETURNS TABLE(
  indicator_id UUID,
  code TEXT,
  name TEXT,
  latest_value NUMERIC,
  latest_date DATE,
  previous_value NUMERIC,
  variation_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (iv.indicator_id)
      iv.indicator_id,
      iv.value AS latest_value,
      iv.reference_date AS latest_date
    FROM indicator_values iv
    JOIN economic_indicators ei ON iv.indicator_id = ei.id
    WHERE p_codes IS NULL OR ei.code = ANY(p_codes)
    ORDER BY iv.indicator_id, iv.reference_date DESC
  ),
  previous AS (
    SELECT DISTINCT ON (iv.indicator_id)
      iv.indicator_id,
      iv.value AS previous_value
    FROM indicator_values iv
    JOIN latest l ON iv.indicator_id = l.indicator_id AND iv.reference_date < l.latest_date
    ORDER BY iv.indicator_id, iv.reference_date DESC
  )
  SELECT
    ei.id AS indicator_id,
    ei.code,
    ei.name,
    l.latest_value,
    l.latest_date,
    p.previous_value,
    CASE 
      WHEN p.previous_value IS NOT NULL AND p.previous_value != 0 
      THEN ROUND(((l.latest_value - p.previous_value) / p.previous_value) * 100, 2)
      ELSE NULL
    END AS variation_percent
  FROM economic_indicators ei
  JOIN latest l ON ei.id = l.indicator_id
  LEFT JOIN previous p ON ei.id = p.indicator_id
  ORDER BY ei.name;
END;
$$;

-- ============================================================
-- FUNÇÕES DE CONTEXTO
-- ============================================================

-- Detectar contexto automaticamente
CREATE OR REPLACE FUNCTION public.detect_context(p_text TEXT)
RETURNS TABLE(
  context_code TEXT,
  context_name TEXT,
  score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.code AS context_code,
    cp.name AS context_name,
    (
      SELECT COUNT(*)::NUMERIC / GREATEST(array_length(cp.detection_keywords, 1), 1)
      FROM unnest(cp.detection_keywords) kw
      WHERE lower(p_text) LIKE '%' || lower(kw) || '%'
    ) AS score
  FROM context_profiles cp
  WHERE cp.is_active = true
    AND cp.detection_keywords IS NOT NULL
    AND array_length(cp.detection_keywords, 1) > 0
  ORDER BY score DESC
  LIMIT 3;
END;
$$;

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

CREATE OR REPLACE VIEW public.v_document_taxonomies AS
SELECT
  d.id AS document_id,
  d.filename,
  d.target_chat,
  d.status,
  gt.code AS taxonomy_code,
  gt.name AS taxonomy_name,
  et.confidence,
  et.source,
  et.is_primary
FROM documents d
LEFT JOIN entity_tags et ON d.id = et.entity_id AND et.entity_type = 'document'
LEFT JOIN global_taxonomy gt ON et.taxonomy_id = gt.id;

CREATE OR REPLACE VIEW public.v_agent_capabilities AS
SELECT
  ca.id,
  ca.name,
  ca.slug,
  ca.description,
  ca.is_active,
  cs.style_name AS communication_style,
  array_agg(DISTINCT gt.code) FILTER (WHERE atp.access_type = 'allowed') AS allowed_taxonomy_codes,
  array_agg(DISTINCT gt.code) FILTER (WHERE atp.access_type = 'forbidden') AS forbidden_taxonomy_codes
FROM chat_agents ca
LEFT JOIN communication_styles cs ON ca.communication_style_id = cs.id
LEFT JOIN agent_tag_profiles atp ON ca.id = atp.agent_id
LEFT JOIN global_taxonomy gt ON atp.taxonomy_id = gt.id
GROUP BY ca.id, ca.name, ca.slug, ca.description, ca.is_active, cs.style_name;

COMMENT ON FUNCTION public.search_documents IS 'Busca semântica em chunks de documentos usando embeddings vetoriais';
COMMENT ON FUNCTION public.has_role IS 'Verifica se um usuário possui uma role específica';
COMMENT ON FUNCTION public.apply_batch_taxonomy IS 'Aplica taxonomias em lote para múltiplos documentos';
