-- Tabela para auditoria de sugestões e coerência contextual
CREATE TABLE public.suggestion_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  chat_type TEXT NOT NULL CHECK (chat_type IN ('health', 'study')),
  user_query TEXT NOT NULL,
  ai_response_preview TEXT,
  suggestions_generated TEXT[] DEFAULT '{}',
  has_rag_context BOOLEAN DEFAULT false,
  rag_documents_used TEXT[] DEFAULT '{}',
  coherence_score NUMERIC(3,2) CHECK (coherence_score >= 0 AND coherence_score <= 1),
  coherence_validated BOOLEAN DEFAULT NULL,
  admin_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by TEXT
);

-- Índices para consultas frequentes
CREATE INDEX idx_suggestion_audit_session ON public.suggestion_audit(session_id);
CREATE INDEX idx_suggestion_audit_chat_type ON public.suggestion_audit(chat_type);
CREATE INDEX idx_suggestion_audit_created ON public.suggestion_audit(created_at DESC);
CREATE INDEX idx_suggestion_audit_coherence ON public.suggestion_audit(coherence_validated);

-- Habilitar RLS
ALTER TABLE public.suggestion_audit ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "System can insert suggestion audits"
  ON public.suggestion_audit
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read suggestion audits"
  ON public.suggestion_audit
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update suggestion audits"
  ON public.suggestion_audit
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Comentário na tabela
COMMENT ON TABLE public.suggestion_audit IS 'Auditoria de sugestões geradas pela IA para validação de coerência contextual';