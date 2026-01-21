-- Fix search_path for increment_version function
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  latest_major INTEGER;
  latest_minor INTEGER;
  latest_patch INTEGER;
  new_patch INTEGER;
  new_minor INTEGER;
  new_major INTEGER;
  new_semver TEXT;
BEGIN
  -- Fetch latest version
  SELECT major, minor, patch INTO latest_major, latest_minor, latest_patch
  FROM public.system_versions
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Defaults if table empty
  IF latest_major IS NULL THEN
    latest_major := 1;
    latest_minor := 0;
    latest_patch := 0;
  END IF;
  
  -- Increment patch
  new_patch := latest_patch + 1;
  new_minor := latest_minor;
  new_major := latest_major;
  
  -- Reset patch if > 99
  IF new_patch > 99 THEN
    new_patch := 0;
    new_minor := new_minor + 1;
  END IF;
  
  -- Reset minor if > 99
  IF new_minor > 99 THEN
    new_minor := 0;
    new_major := new_major + 1;
  END IF;
  
  new_semver := new_major || '.' || new_minor || '.' || new_patch;
  
  -- Insert new version
  INSERT INTO public.system_versions (semver, major, minor, patch, change_log, trigger_source)
  VALUES (new_semver, new_major, new_minor, new_patch, NEW.action, NEW.action_category);
  
  RETURN NEW;
END;
$$;