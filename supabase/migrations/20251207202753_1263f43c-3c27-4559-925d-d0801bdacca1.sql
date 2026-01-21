-- Update function to include parent_tag_name in document_tags_data
CREATE OR REPLACE FUNCTION public.update_chat_config_on_tag_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc_target_chat TEXT;
BEGIN
  -- Buscar o target_chat do documento
  SELECT target_chat INTO doc_target_chat
  FROM public.documents WHERE id = NEW.document_id;
  
  IF doc_target_chat IS NOT NULL THEN
    -- Atualizar scope_topics e tags_data
    UPDATE public.chat_config SET
      scope_topics = (
        SELECT COALESCE(ARRAY_AGG(DISTINCT dt.tag_name), '{}'::text[])
        FROM public.document_tags dt
        JOIN public.documents d ON dt.document_id = d.id
        WHERE d.target_chat = doc_target_chat 
          AND d.status = 'completed'
          AND dt.tag_type = 'parent'
          AND dt.confidence >= 0.7
      ),
      document_tags_data = (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'tag_name', tag_name,
              'tag_type', tag_type,
              'avg_confidence', avg_conf,
              'count', tag_count,
              'parent_tag_name', parent_name
            ) ORDER BY tag_count DESC, avg_conf DESC
          ),
          '[]'::jsonb
        )
        FROM (
          SELECT 
            dt.tag_name,
            dt.tag_type,
            AVG(dt.confidence) as avg_conf,
            COUNT(*) as tag_count,
            pt.tag_name as parent_name
          FROM public.document_tags dt
          LEFT JOIN public.document_tags pt ON dt.parent_tag_id = pt.id
          JOIN public.documents d ON dt.document_id = d.id
          WHERE d.target_chat = doc_target_chat AND d.status = 'completed'
          GROUP BY dt.tag_name, dt.tag_type, pt.tag_name
        ) tag_stats
      ),
      updated_at = NOW()
    WHERE chat_type = doc_target_chat;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the trigger function for document status changes
CREATE OR REPLACE FUNCTION public.update_chat_config_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.chat_config SET
    -- Estatísticas existentes
    total_documents = (
      SELECT COUNT(*) 
      FROM public.documents 
      WHERE target_chat = NEW.target_chat AND status = 'completed'
    ),
    total_chunks = (
      SELECT COUNT(*) 
      FROM public.document_chunks dc 
      JOIN public.documents d ON dc.document_id = d.id 
      WHERE d.target_chat = NEW.target_chat AND d.status = 'completed'
    ),
    last_document_added = NOW(),
    
    -- scope_topics das tags parent com alta confidence
    scope_topics = (
      SELECT COALESCE(ARRAY_AGG(DISTINCT dt.tag_name), '{}'::text[])
      FROM public.document_tags dt
      JOIN public.documents d ON dt.document_id = d.id
      WHERE d.target_chat = NEW.target_chat 
        AND d.status = 'completed'
        AND dt.tag_type = 'parent'
        AND dt.confidence >= 0.7
    ),
    
    -- Dados completos das tags para UI com parent_tag_name
    document_tags_data = (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'tag_name', tag_name,
            'tag_type', tag_type,
            'avg_confidence', avg_conf,
            'count', tag_count,
            'parent_tag_name', parent_name
          ) ORDER BY tag_count DESC, avg_conf DESC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT 
          dt.tag_name,
          dt.tag_type,
          AVG(dt.confidence) as avg_conf,
          COUNT(*) as tag_count,
          pt.tag_name as parent_name
        FROM public.document_tags dt
        LEFT JOIN public.document_tags pt ON dt.parent_tag_id = pt.id
        JOIN public.documents d ON dt.document_id = d.id
        WHERE d.target_chat = NEW.target_chat AND d.status = 'completed'
        GROUP BY dt.tag_name, dt.tag_type, pt.tag_name
      ) tag_stats
    ),
    
    updated_at = NOW()
  WHERE chat_type = NEW.target_chat;
  
  RETURN NEW;
END;
$function$;

-- Force recalculation of existing chat_config data
UPDATE public.chat_config cc SET
  document_tags_data = (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'tag_name', tag_name,
          'tag_type', tag_type,
          'avg_confidence', avg_conf,
          'count', tag_count,
          'parent_tag_name', parent_name
        ) ORDER BY tag_count DESC, avg_conf DESC
      ),
      '[]'::jsonb
    )
    FROM (
      SELECT 
        dt.tag_name,
        dt.tag_type,
        AVG(dt.confidence) as avg_conf,
        COUNT(*) as tag_count,
        pt.tag_name as parent_name
      FROM public.document_tags dt
      LEFT JOIN public.document_tags pt ON dt.parent_tag_id = pt.id
      JOIN public.documents d ON dt.document_id = d.id
      WHERE d.target_chat = cc.chat_type AND d.status = 'completed'
      GROUP BY dt.tag_name, dt.tag_type, pt.tag_name
    ) tag_stats
  ),
  updated_at = NOW();