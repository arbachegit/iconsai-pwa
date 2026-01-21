-- Remove the existing constraint that's missing CODE_CHANGE and ROLLBACK
ALTER TABLE version_control 
DROP CONSTRAINT IF EXISTS version_control_trigger_type_check;

-- Create new constraint with all valid trigger types
ALTER TABLE version_control 
ADD CONSTRAINT version_control_trigger_type_check 
CHECK (trigger_type IN (
  'AUTO_PATCH', 
  'MANUAL_MINOR', 
  'MANUAL_MAJOR', 
  'CODE_CHANGE', 
  'INITIAL', 
  'ROLLBACK'
));