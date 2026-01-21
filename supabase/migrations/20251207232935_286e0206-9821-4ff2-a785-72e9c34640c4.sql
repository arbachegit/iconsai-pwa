-- Remover constraint existente que limita a 0-1
ALTER TABLE public.suggestion_audit 
DROP CONSTRAINT IF EXISTS suggestion_audit_coherence_score_check;

-- Criar nova constraint permitindo valores de 0 a 10
ALTER TABLE public.suggestion_audit 
ADD CONSTRAINT suggestion_audit_coherence_score_check 
CHECK (coherence_score >= 0 AND coherence_score <= 10);