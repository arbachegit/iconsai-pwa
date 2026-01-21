-- Auto-insert existing health/study documents that were processed before auto-insertion logic
UPDATE documents 
SET 
  is_inserted = true,
  inserted_in_chat = target_chat,
  inserted_at = NOW()
WHERE 
  target_chat IN ('health', 'study')
  AND (is_inserted = false OR is_inserted IS NULL)
  AND status = 'completed';

-- Create retroactive routing logs for auto-inserted documents
INSERT INTO document_routing_log (
  document_id,
  document_name,
  original_category,
  final_category,
  action_type,
  session_id,
  scope_changed,
  disclaimer_shown,
  metadata
)
SELECT 
  d.id,
  d.filename,
  d.target_chat,
  d.target_chat,
  'auto_expanded',
  'migration-' || NOW()::text,
  true,
  true,
  jsonb_build_object(
    'migration_date', NOW(),
    'reason', 'Retroactive auto-insertion for health/study documents'
  )
FROM documents d
WHERE 
  d.target_chat IN ('health', 'study')
  AND d.is_inserted = true
  AND d.inserted_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM document_routing_log drl 
    WHERE drl.document_id = d.id
  )
  AND d.status = 'completed';