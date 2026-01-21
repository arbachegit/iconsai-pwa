-- Add unique index on section_id for generated_images caching
CREATE UNIQUE INDEX IF NOT EXISTS generated_images_section_id_unique 
ON generated_images(section_id);