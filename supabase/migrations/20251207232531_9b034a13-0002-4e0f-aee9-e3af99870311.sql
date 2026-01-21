-- Corrigir overflow do campo coherence_score
-- Alterar de NUMERIC(3,2) para NUMERIC(4,2) para permitir valor 10.00
ALTER TABLE public.suggestion_audit 
ALTER COLUMN coherence_score TYPE NUMERIC(4,2);