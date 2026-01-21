-- =============================================
-- FUNÇÃO: search_by_taxonomy
-- Busca documentos por taxonomia com fallback para sistema legado
-- =============================================

-- 1. Criar índices de performance para entity_tags
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity_type_id 
ON entity_tags(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_tags_taxonomy_id 
ON entity_tags(taxonomy_id);

CREATE INDEX IF NOT EXISTS idx_entity_tags_composite 
ON entity_tags(entity_type, taxonomy_id, entity_id);

-- 2. Criar índice para global_taxonomy (busca por código)
CREATE INDEX IF NOT EXISTS idx_global_taxonomy_code 
ON global_taxonomy(code);

CREATE INDEX IF NOT EXISTS idx_global_taxonomy_parent_code 
ON global_taxonomy(parent_id, code);

-- 3. Criar a função search_by_taxonomy
CREATE OR REPLACE FUNCTION search_by_taxonomy(
  query_embedding vector(1536),
  tag_codes TEXT[],
  exclude_tag_codes TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.15,
  match_count INTEGER DEFAULT 10
) RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity double precision,
  metadata jsonb,
  document_filename text,
  taxonomy_code text,
  search_source text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  taxonomy_ids UUID[];
  has_entity_tags BOOLEAN;
BEGIN
  -- 1. Resolver códigos de taxonomia para UUIDs (incluindo filhos hierárquicos)
  SELECT ARRAY_AGG(DISTINCT gt.id) INTO taxonomy_ids
  FROM global_taxonomy gt
  WHERE gt.code = ANY(tag_codes)
     OR gt.code LIKE ANY(SELECT t || '.%' FROM unnest(tag_codes) t);

  -- 2. Verificar se entity_tags tem dados para esses taxonomia_ids
  IF taxonomy_ids IS NOT NULL AND array_length(taxonomy_ids, 1) > 0 THEN
    SELECT EXISTS(
      SELECT 1 FROM entity_tags 
      WHERE entity_type = 'document' 
      AND taxonomy_id = ANY(taxonomy_ids)
      LIMIT 1
    ) INTO has_entity_tags;
  ELSE
    has_entity_tags := FALSE;
  END IF;

  -- 3A. Se entity_tags tem dados: usar novo sistema de taxonomia
  IF has_entity_tags THEN
    RETURN QUERY
    SELECT 
      dc.id AS chunk_id,
      dc.document_id,
      dc.content,
      1 - (dc.embedding <=> query_embedding) AS similarity,
      dc.metadata,
      d.filename AS document_filename,
      gt.code AS taxonomy_code,
      'taxonomy'::text AS search_source
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    JOIN entity_tags et ON et.entity_id = d.id AND et.entity_type = 'document'
    JOIN global_taxonomy gt ON gt.id = et.taxonomy_id
    WHERE d.status = 'completed'
      AND d.is_readable = true
      AND et.taxonomy_id = ANY(taxonomy_ids)
      AND (exclude_tag_codes IS NULL OR NOT EXISTS (
        SELECT 1 FROM global_taxonomy exc 
        WHERE exc.id = et.taxonomy_id 
        AND (exc.code = ANY(exclude_tag_codes) OR exc.code LIKE ANY(SELECT t || '.%' FROM unnest(exclude_tag_codes) t))
      ))
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
  
  -- 3B. Fallback: usar sistema legado (target_chat / inserted_in_chat)
  ELSE
    RETURN QUERY
    SELECT 
      dc.id AS chunk_id,
      dc.document_id,
      dc.content,
      1 - (dc.embedding <=> query_embedding) AS similarity,
      dc.metadata,
      d.filename AS document_filename,
      COALESCE(d.inserted_in_chat, d.target_chat) AS taxonomy_code,
      'legacy_fallback'::text AS search_source
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE d.status = 'completed'
      AND d.is_readable = true
      AND (
        -- Mapear códigos de taxonomia para target_chat legado
        (tag_codes && ARRAY['economia', 'economia.indicadores', 'economia.mercados', 'economia.analise', 'economia.politica']) 
          AND (d.target_chat IN ('economy', 'both') OR d.inserted_in_chat IN ('economy', 'both'))
        OR
        (tag_codes && ARRAY['saude', 'saude.prevencao', 'saude.procedimentos', 'saude.mental', 'saude.nutricao']) 
          AND (d.target_chat IN ('health', 'both') OR d.inserted_in_chat IN ('health', 'both'))
        OR
        (tag_codes && ARRAY['conhecimento', 'conhecimento.knowyou', 'conhecimento.formacao', 'conhecimento.metodologia']) 
          AND (d.target_chat IN ('knowyou', 'both') OR d.inserted_in_chat IN ('knowyou', 'both'))
        OR
        -- Se nenhum mapeamento específico, buscar em todos
        (tag_codes IS NULL OR array_length(tag_codes, 1) = 0)
      )
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
  END IF;
END;
$$;

-- 4. Adicionar comentário explicativo
COMMENT ON FUNCTION search_by_taxonomy IS 
'Busca documentos por códigos de taxonomia hierárquica.
Se entity_tags estiver populada, usa o novo sistema.
Caso contrário, faz fallback para target_chat/inserted_in_chat.
O campo search_source indica qual sistema foi usado.';