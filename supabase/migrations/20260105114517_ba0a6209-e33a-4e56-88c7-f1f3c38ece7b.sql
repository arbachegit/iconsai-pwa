-- Create municipios table for Brazilian municipalities
CREATE TABLE public.municipios (
  codigo_ibge INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL CHECK (char_length(uf) = 2) REFERENCES public.estados(uf),
  capital BOOLEAN DEFAULT false,
  codigo_uf INTEGER NOT NULL,
  regiao TEXT NOT NULL,
  populacao_2022 INTEGER,
  pib_2021_milhoes INTEGER,
  lat NUMERIC,
  lng NUMERIC,
  ddd INTEGER,
  fuso_horario TEXT
);

-- Create indexes for common query patterns
CREATE INDEX idx_municipios_uf ON public.municipios(uf);
CREATE INDEX idx_municipios_regiao ON public.municipios(regiao);
CREATE INDEX idx_municipios_nome ON public.municipios(nome);
CREATE INDEX idx_municipios_codigo_uf ON public.municipios(codigo_uf);

-- Enable Row Level Security
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon and authenticated users can SELECT)
CREATE POLICY "Allow public read access to municipios"
ON public.municipios
FOR SELECT
TO anon, authenticated
USING (true);

-- Add table comment
COMMENT ON TABLE public.municipios IS 'Brazilian municipalities reference data (5,570 cities)';