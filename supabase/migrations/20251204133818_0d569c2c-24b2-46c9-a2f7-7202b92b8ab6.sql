-- Tabela para logs de latência de digitação crítica
CREATE TABLE public.typing_latency_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  component TEXT NOT NULL,
  latency_ms NUMERIC NOT NULL,
  avg_latency_ms NUMERIC,
  max_latency_ms NUMERIC,
  sample_count INTEGER DEFAULT 1,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para queries por sessão e data
CREATE INDEX idx_typing_latency_session ON public.typing_latency_logs(session_id);
CREATE INDEX idx_typing_latency_created ON public.typing_latency_logs(created_at DESC);

-- RLS desabilitado pois é log de diagnóstico interno
ALTER TABLE public.typing_latency_logs ENABLE ROW LEVEL SECURITY;

-- Política permissiva para inserção (qualquer um pode inserir logs de latência)
CREATE POLICY "Anyone can insert latency logs"
  ON public.typing_latency_logs
  FOR INSERT
  WITH CHECK (true);

-- Apenas admins podem ler os logs
CREATE POLICY "Admins can read latency logs"
  ON public.typing_latency_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );