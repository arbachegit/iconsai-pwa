-- Criar bucket público para imagens da timeline
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'timeline-images',
  'timeline-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/webp', 'image/png', 'image/jpeg']
);

-- Política de leitura pública
CREATE POLICY "Public read access for timeline images"
ON storage.objects FOR SELECT
USING (bucket_id = 'timeline-images');

-- Política de inserção para funções autenticadas
CREATE POLICY "Authenticated insert for timeline images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'timeline-images');

-- Política de atualização para funções autenticadas
CREATE POLICY "Authenticated update for timeline images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'timeline-images');

-- Política de deleção para funções autenticadas
CREATE POLICY "Authenticated delete for timeline images"
ON storage.objects FOR DELETE
USING (bucket_id = 'timeline-images');