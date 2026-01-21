-- Clean up duplicate parent tags
-- This migration identifies duplicate parent tags and unifies them

DO $$
DECLARE
  duplicate_record RECORD;
  oldest_tag_id UUID;
  duplicate_ids UUID[];
BEGIN
  -- For each duplicate tag name, keep the oldest and reassign children
  FOR duplicate_record IN
    SELECT tag_name, array_agg(id ORDER BY created_at) as ids
    FROM document_tags
    WHERE parent_tag_id IS NULL
    GROUP BY tag_name
    HAVING COUNT(*) > 1
  LOOP
    -- First tag (oldest) becomes the target
    oldest_tag_id := duplicate_record.ids[1];
    
    -- All other tags are duplicates to remove
    duplicate_ids := duplicate_record.ids[2:array_length(duplicate_record.ids, 1)];
    
    -- Log the unification
    RAISE NOTICE 'Unifying tag "%" - keeping % and removing % duplicates', 
      duplicate_record.tag_name, oldest_tag_id, array_length(duplicate_ids, 1);
    
    -- Move all child tags to the oldest parent
    UPDATE document_tags 
    SET parent_tag_id = oldest_tag_id
    WHERE parent_tag_id = ANY(duplicate_ids);
    
    -- Delete the duplicate parent tags
    DELETE FROM document_tags 
    WHERE id = ANY(duplicate_ids);
  END LOOP;
END $$;

-- Add a comment to track this cleanup
COMMENT ON TABLE document_tags IS 'Tag system with duplicate cleanup performed on 2025-11-30';
