-- ============================================
-- DICIONÁRIO LÉXICO
-- ============================================
CREATE TABLE lexicon_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Termo
  term TEXT NOT NULL,
  term_normalized TEXT NOT NULL,  -- lowercase, sem acentos
  
  -- Classificação
  taxonomy_id UUID REFERENCES global_taxonomy(id),
  part_of_speech TEXT CHECK (part_of_speech IN (
    'noun', 'verb', 'adjective', 'adverb', 'acronym', 'proper_noun'
  )),
  
  -- Definições
  definition TEXT NOT NULL,
  definition_simple TEXT,  -- Versão simplificada
  example_usage TEXT,
  
  -- Contextos
  domain TEXT[],  -- ['economia', 'finanças']
  register TEXT CHECK (register IN ('formal', 'informal', 'technical', 'colloquial')),
  
  -- Relações
  synonyms TEXT[],
  antonyms TEXT[],
  related_terms TEXT[],
  
  -- Fonética
  pronunciation_ipa TEXT,
  pronunciation_phonetic TEXT,  -- Para TTS
  audio_url TEXT,
  
  -- Controle
  source TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(term, taxonomy_id)
);

CREATE INDEX idx_lexicon_term ON lexicon_terms(term_normalized);
CREATE INDEX idx_lexicon_taxonomy ON lexicon_terms(taxonomy_id);

-- ============================================
-- ONTOLOGIA (Conceitos e Relações)
-- ============================================
CREATE TABLE ontology_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Conceito
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  description TEXT,
  
  -- Taxonomia
  taxonomy_id UUID REFERENCES global_taxonomy(id),
  
  -- Propriedades
  properties JSONB DEFAULT '{}',
  -- Ex: { "tipo": "indicador", "periodicidade": "mensal" }
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ontology_concept_name ON ontology_concepts(name_normalized);
CREATE INDEX idx_ontology_concept_taxonomy ON ontology_concepts(taxonomy_id);

CREATE TABLE ontology_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relação
  subject_id UUID NOT NULL REFERENCES ontology_concepts(id) ON DELETE CASCADE,
  predicate TEXT NOT NULL,  -- 'is_a', 'part_of', 'related_to', 'causes', 'measures'
  object_id UUID NOT NULL REFERENCES ontology_concepts(id) ON DELETE CASCADE,
  
  -- Metadados
  weight FLOAT DEFAULT 1.0,
  bidirectional BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(subject_id, predicate, object_id)
);

CREATE INDEX idx_ontology_relations_subject ON ontology_relations(subject_id);
CREATE INDEX idx_ontology_relations_object ON ontology_relations(object_id);
CREATE INDEX idx_ontology_relations_predicate ON ontology_relations(predicate);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE lexicon_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ontology_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ontology_relations ENABLE ROW LEVEL SECURITY;

-- Lexicon Terms
CREATE POLICY "Admins manage lexicon_terms" ON lexicon_terms FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Public read approved lexicon" ON lexicon_terms FOR SELECT
USING (is_approved = true);

-- Ontology Concepts
CREATE POLICY "Admins manage ontology_concepts" ON ontology_concepts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Public read ontology_concepts" ON ontology_concepts FOR SELECT
USING (true);

-- Ontology Relations
CREATE POLICY "Admins manage ontology_relations" ON ontology_relations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Public read ontology_relations" ON ontology_relations FOR SELECT
USING (true);

-- ============================================
-- FUNCTION: get_term_context
-- ============================================
CREATE OR REPLACE FUNCTION get_term_context(p_term TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  normalized_term TEXT;
BEGIN
  -- Normalizar termo (lowercase, remover caracteres especiais)
  normalized_term := LOWER(REGEXP_REPLACE(UNACCENT(p_term), '[^a-z0-9]', '', 'g'));
  
  SELECT jsonb_build_object(
    'term', lt.term,
    'definition', lt.definition,
    'definition_simple', lt.definition_simple,
    'example_usage', lt.example_usage,
    'part_of_speech', lt.part_of_speech,
    'domain', lt.domain,
    'register', lt.register,
    'synonyms', lt.synonyms,
    'antonyms', lt.antonyms,
    'related_terms', lt.related_terms,
    'pronunciation_ipa', lt.pronunciation_ipa,
    'pronunciation_phonetic', lt.pronunciation_phonetic,
    'taxonomy_code', gt.code,
    'taxonomy_name', gt.name,
    'ontology_relations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'predicate', orel.predicate,
        'object_name', oc2.name,
        'object_description', oc2.description,
        'weight', orel.weight,
        'bidirectional', orel.bidirectional
      )), '[]'::jsonb)
      FROM ontology_concepts oc
      JOIN ontology_relations orel ON oc.id = orel.subject_id
      JOIN ontology_concepts oc2 ON orel.object_id = oc2.id
      WHERE oc.name_normalized = normalized_term
    ),
    'reverse_relations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'predicate', orel.predicate,
        'subject_name', oc2.name,
        'subject_description', oc2.description,
        'weight', orel.weight
      )), '[]'::jsonb)
      FROM ontology_concepts oc
      JOIN ontology_relations orel ON oc.id = orel.object_id
      JOIN ontology_concepts oc2 ON orel.subject_id = oc2.id
      WHERE oc.name_normalized = normalized_term
      AND orel.bidirectional = true
    )
  ) INTO result
  FROM lexicon_terms lt
  LEFT JOIN global_taxonomy gt ON lt.taxonomy_id = gt.id
  WHERE lt.term_normalized = normalized_term
  AND lt.is_approved = true
  LIMIT 1;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- ============================================
-- SEED DATA: Termos Econômicos Essenciais
-- ============================================

-- Inserir termos do léxico
INSERT INTO lexicon_terms (term, term_normalized, part_of_speech, definition, definition_simple, example_usage, domain, register, synonyms, related_terms, pronunciation_phonetic, source, is_approved) VALUES
('SELIC', 'selic', 'acronym', 
 'Sistema Especial de Liquidação e de Custódia. Taxa básica de juros da economia brasileira, definida pelo Comitê de Política Monetária (COPOM) do Banco Central.',
 'A taxa de juros principal do Brasil, que influencia todas as outras taxas.',
 'O COPOM decidiu manter a SELIC em 13,75% ao ano.',
 ARRAY['economia', 'política monetária'], 'technical',
 ARRAY['taxa básica', 'taxa de juros'], ARRAY['COPOM', 'juros', 'Banco Central'],
 'sé-lik', 'Banco Central do Brasil', true),

('IPCA', 'ipca', 'acronym',
 'Índice Nacional de Preços ao Consumidor Amplo. Principal indicador de inflação do Brasil, calculado pelo IBGE.',
 'O índice que mede quanto os preços aumentaram no Brasil.',
 'O IPCA de maio ficou em 0,23%, abaixo das expectativas.',
 ARRAY['economia', 'inflação'], 'technical',
 ARRAY['inflação oficial', 'índice de preços'], ARRAY['IBGE', 'inflação', 'preços'],
 'í-pê-cê-á', 'IBGE', true),

('PIB', 'pib', 'acronym',
 'Produto Interno Bruto. Soma de todos os bens e serviços finais produzidos em um país durante um período.',
 'O valor total de tudo que o país produz.',
 'O PIB brasileiro cresceu 2,9% em 2023.',
 ARRAY['economia', 'atividade econômica'], 'technical',
 ARRAY['produto interno', 'riqueza nacional'], ARRAY['crescimento', 'recessão', 'economia'],
 'pê-í-bê', 'IBGE', true),

('inflação', 'inflacao', 'noun',
 'Aumento generalizado e contínuo dos preços de bens e serviços em uma economia ao longo do tempo.',
 'Quando os preços de tudo ficam mais caros.',
 'A inflação corrói o poder de compra das famílias.',
 ARRAY['economia'], 'formal',
 ARRAY['carestia', 'alta de preços'], ARRAY['IPCA', 'juros', 'preços'],
 'in-fla-são', NULL, true),

('juros', 'juros', 'noun',
 'Remuneração pelo uso do capital alheio ou custo do dinheiro no tempo. Taxa cobrada por empréstimos.',
 'O preço que você paga para usar o dinheiro de outra pessoa.',
 'Os juros do cartão de crédito estão muito altos.',
 ARRAY['economia', 'finanças'], 'formal',
 ARRAY['taxa de juros', 'rendimento'], ARRAY['SELIC', 'empréstimo', 'crédito'],
 'jú-ros', NULL, true),

('PMC', 'pmc', 'acronym',
 'Pesquisa Mensal de Comércio. Levantamento do IBGE que mede o desempenho do varejo brasileiro.',
 'Pesquisa que mostra como estão as vendas no comércio.',
 'A PMC indicou crescimento de 1,5% no varejo em abril.',
 ARRAY['economia', 'varejo'], 'technical',
 ARRAY['pesquisa do comércio', 'vendas do varejo'], ARRAY['varejo', 'consumo', 'IBGE'],
 'pê-ême-cê', 'IBGE', true),

('varejo', 'varejo', 'noun',
 'Modalidade de comércio que vende produtos diretamente ao consumidor final, geralmente em pequenas quantidades.',
 'Lojas que vendem direto para as pessoas.',
 'O varejo brasileiro teve queda nas vendas de eletrodomésticos.',
 ARRAY['economia', 'comércio'], 'formal',
 ARRAY['comércio varejista', 'retail'], ARRAY['PMC', 'consumo', 'vendas'],
 'va-rê-jo', NULL, true),

('consumo', 'consumo', 'noun',
 'Aquisição de bens e serviços pelas famílias para satisfação de necessidades ou desejos.',
 'O ato de comprar e usar produtos.',
 'O consumo das famílias representa 65% do PIB.',
 ARRAY['economia'], 'formal',
 ARRAY['demanda', 'gastos das famílias'], ARRAY['varejo', 'PIB', 'renda'],
 'con-sú-mo', NULL, true),

('COPOM', 'copom', 'acronym',
 'Comitê de Política Monetária do Banco Central do Brasil. Define a taxa SELIC a cada 45 dias.',
 'O grupo do Banco Central que decide a taxa de juros.',
 'O COPOM se reúne a cada 45 dias para definir a SELIC.',
 ARRAY['economia', 'política monetária'], 'technical',
 ARRAY['comitê monetário'], ARRAY['SELIC', 'Banco Central', 'juros'],
 'có-pom', 'Banco Central do Brasil', true),

('recessão', 'recessao', 'noun',
 'Período de declínio econômico caracterizado por dois trimestres consecutivos de queda do PIB.',
 'Quando a economia do país encolhe por um tempo.',
 'O país entrou em recessão técnica após dois trimestres negativos.',
 ARRAY['economia'], 'formal',
 ARRAY['retração econômica', 'crise'], ARRAY['PIB', 'crescimento', 'desemprego'],
 'rê-cês-são', NULL, true);

-- Inserir conceitos ontológicos
INSERT INTO ontology_concepts (name, name_normalized, description, properties) VALUES
('SELIC', 'selic', 'Taxa básica de juros da economia brasileira', '{"tipo": "indicador", "periodicidade": "a cada 45 dias", "emissor": "Banco Central"}'),
('IPCA', 'ipca', 'Índice oficial de inflação do Brasil', '{"tipo": "indicador", "periodicidade": "mensal", "emissor": "IBGE"}'),
('PIB', 'pib', 'Produto Interno Bruto', '{"tipo": "indicador", "periodicidade": "trimestral", "emissor": "IBGE"}'),
('inflação', 'inflacao', 'Aumento geral de preços', '{"tipo": "fenômeno econômico"}'),
('juros', 'juros', 'Custo do dinheiro no tempo', '{"tipo": "conceito econômico"}'),
('consumo', 'consumo', 'Gastos das famílias', '{"tipo": "componente do PIB"}'),
('varejo', 'varejo', 'Comércio direto ao consumidor', '{"tipo": "setor econômico"}'),
('PMC', 'pmc', 'Pesquisa Mensal de Comércio', '{"tipo": "indicador", "periodicidade": "mensal", "emissor": "IBGE"}'),
('indicador_monetario', 'indicadormonetario', 'Categoria de indicadores de política monetária', '{"tipo": "categoria"}'),
('indicador_inflacionario', 'indicadorinflacionario', 'Categoria de indicadores de inflação', '{"tipo": "categoria"}'),
('atividade_economica', 'atividadeeconomica', 'Nível de produção e transações na economia', '{"tipo": "conceito agregado"}'),
('reducao_consumo', 'reducaoconsumo', 'Diminuição dos gastos das famílias', '{"tipo": "efeito econômico"}'),
('juros_altos', 'jurosaltos', 'Taxas de juros elevadas', '{"tipo": "condição econômica"}'),
('crescimento_economico', 'crescimentoeconomico', 'Aumento do PIB ao longo do tempo', '{"tipo": "objetivo macroeconômico"}');

-- Inserir relações ontológicas
INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'is_a', o.id, 1.0, false
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'SELIC' AND o.name = 'indicador_monetario';

INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'is_a', o.id, 1.0, false
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'IPCA' AND o.name = 'indicador_inflacionario';

INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'measures', o.id, 1.0, false
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'IPCA' AND o.name = 'inflação';

INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'measures', o.id, 1.0, false
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'PIB' AND o.name = 'atividade_economica';

INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'measures', o.id, 1.0, false
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'PMC' AND o.name = 'varejo';

INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'causes', o.id, 0.8, false
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'juros_altos' AND o.name = 'reducao_consumo';

INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'influences', o.id, 0.9, false
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'SELIC' AND o.name = 'juros';

INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'part_of', o.id, 1.0, false
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'consumo' AND o.name = 'PIB';

INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'related_to', o.id, 0.7, true
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'inflação' AND o.name = 'juros';

INSERT INTO ontology_relations (subject_id, predicate, object_id, weight, bidirectional)
SELECT s.id, 'leads_to', o.id, 0.85, false
FROM ontology_concepts s, ontology_concepts o
WHERE s.name = 'crescimento_economico' AND o.name = 'consumo';