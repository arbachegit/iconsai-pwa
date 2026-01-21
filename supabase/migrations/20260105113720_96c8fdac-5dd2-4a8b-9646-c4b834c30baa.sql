-- Create estados table for Brazilian states
CREATE TABLE public.estados (
  codigo_uf INTEGER PRIMARY KEY,
  uf TEXT NOT NULL UNIQUE CHECK (char_length(uf) = 2),
  nome TEXT NOT NULL,
  regiao TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC
);

-- Create indexes for common query patterns
CREATE INDEX idx_estados_uf ON public.estados(uf);
CREATE INDEX idx_estados_regiao ON public.estados(regiao);

-- Enable Row Level Security
ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon and authenticated users can SELECT)
CREATE POLICY "Allow public read access to estados"
ON public.estados
FOR SELECT
TO anon, authenticated
USING (true);

-- Add table comment
COMMENT ON TABLE public.estados IS 'Brazilian states reference data (27 UFs)';