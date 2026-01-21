-- PARTE 1: Adicionar nova coluna document_tags_data
ALTER TABLE public.chat_config ADD COLUMN IF NOT EXISTS document_tags_data JSONB DEFAULT '[]'::jsonb;

-- PARTE 2: Modificar função update_chat_config_stats para incluir tags
CREATE OR REPLACE FUNCTION public.update_chat_config_stats()
RETURNS TRIGGER AS $$
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
    
    -- NOVO: Atualizar scope_topics das tags parent com alta confidence
    scope_topics = (
      SELECT COALESCE(ARRAY_AGG(DISTINCT dt.tag_name), '{}'::text[])
      FROM public.document_tags dt
      JOIN public.documents d ON dt.document_id = d.id
      WHERE d.target_chat = NEW.target_chat 
        AND d.status = 'completed'
        AND dt.tag_type = 'parent'
        AND dt.confidence >= 0.7
    ),
    
    -- NOVO: Dados completos das tags para UI
    document_tags_data = (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'tag_name', tag_name,
            'tag_type', tag_type,
            'avg_confidence', avg_conf,
            'count', tag_count
          ) ORDER BY tag_count DESC, avg_conf DESC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT 
          dt.tag_name,
          dt.tag_type,
          AVG(dt.confidence) as avg_conf,
          COUNT(*) as tag_count
        FROM public.document_tags dt
        JOIN public.documents d ON dt.document_id = d.id
        WHERE d.target_chat = NEW.target_chat AND d.status = 'completed'
        GROUP BY dt.tag_name, dt.tag_type
      ) tag_stats
    ),
    
    updated_at = NOW()
  WHERE chat_type = NEW.target_chat;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- PARTE 3: Criar função e trigger para atualização quando tags são inseridas
CREATE OR REPLACE FUNCTION public.update_chat_config_on_tag_insert()
RETURNS TRIGGER AS $$
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
              'count', tag_count
            ) ORDER BY tag_count DESC, avg_conf DESC
          ),
          '[]'::jsonb
        )
        FROM (
          SELECT 
            dt.tag_name,
            dt.tag_type,
            AVG(dt.confidence) as avg_conf,
            COUNT(*) as tag_count
          FROM public.document_tags dt
          JOIN public.documents d ON dt.document_id = d.id
          WHERE d.target_chat = doc_target_chat AND d.status = 'completed'
          GROUP BY dt.tag_name, dt.tag_type
        ) tag_stats
      ),
      updated_at = NOW()
    WHERE chat_type = doc_target_chat;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger em document_tags
DROP TRIGGER IF EXISTS on_tag_insert_update_config ON public.document_tags;
CREATE TRIGGER on_tag_insert_update_config
AFTER INSERT ON public.document_tags
FOR EACH ROW EXECUTE FUNCTION public.update_chat_config_on_tag_insert();