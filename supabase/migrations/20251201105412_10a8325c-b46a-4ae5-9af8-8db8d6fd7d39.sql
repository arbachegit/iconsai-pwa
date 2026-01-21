-- Criar bucket de Storage para imagens de conteúdo (seções e tooltips)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-images',
  'content-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/webp', 'image/png', 'image/jpeg']
);

-- Políticas de acesso público para leitura
CREATE POLICY "Public read access for content images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content-images');

-- Políticas para autenticados inserirem, atualizarem e deletarem
CREATE POLICY "Authenticated users can insert content images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content-images');

CREATE POLICY "Authenticated users can update content images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'content-images');

CREATE POLICY "Authenticated users can delete content images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'content-images');