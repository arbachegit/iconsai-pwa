-- Create function to search documents by individual keywords
CREATE OR REPLACE FUNCTION public.search_documents_keywords(
  keywords text[],
  target_chat_filter text DEFAULT NULL,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity double precision,
  metadata jsonb,
  matched_keyword text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id AS chunk_id,
    dc.document_id,
    dc.content,
    0.5::double precision AS similarity,
    dc.metadata,
    kw AS matched_keyword
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  CROSS JOIN LATERAL unnest(keywords) AS kw
  WHERE d.status = 'completed'
    AND d.is_readable = true
    AND (target_chat_filter IS NULL OR d.target_chat = target_chat_filter)
    AND dc.content ILIKE '%' || kw || '%'
  GROUP BY dc.id, dc.document_id, dc.content, dc.metadata, kw
  ORDER BY length(kw) DESC
  LIMIT match_count;
END;
$$;