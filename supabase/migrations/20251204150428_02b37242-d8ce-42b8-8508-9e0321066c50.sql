-- Create function to increment merge rule count
CREATE OR REPLACE FUNCTION public.increment_merge_rule_count(p_source_tag text, p_chat_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tag_merge_rules
  SET merge_count = COALESCE(merge_count, 0) + 1
  WHERE LOWER(source_tag) = LOWER(p_source_tag)
    AND chat_type = p_chat_type;
END;
$$;