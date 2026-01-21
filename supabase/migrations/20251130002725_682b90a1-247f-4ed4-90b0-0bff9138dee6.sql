-- Fix function search_path for update_generated_images_updated_at trigger
CREATE OR REPLACE FUNCTION public.update_generated_images_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;