-- Migration: add_unique_constraint_lexicon_term
-- Adicionar UNIQUE constraint no campo term para permitir upsert no import CSV

-- 1. Remover duplicatas existentes (manter o registro mais recente por termo)
DELETE FROM lexicon_terms a
USING lexicon_terms b
WHERE a.created_at < b.created_at
  AND a.term = b.term;

-- 2. Adicionar constraint UNIQUE simples no campo term
ALTER TABLE lexicon_terms
ADD CONSTRAINT lexicon_terms_term_unique UNIQUE (term);