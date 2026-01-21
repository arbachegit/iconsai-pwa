-- =============================================
-- SEED: Taxonomia Global Inicial
-- =============================================

-- NÍVEL 1: Domínios principais
INSERT INTO global_taxonomy (code, name, description, level, icon, color, keywords, synonyms) VALUES
('economia', 'Economia', 'Temas econômicos e financeiros', 1, '📊', '#10B981', 
 ARRAY['economia', 'financeiro', 'mercado', 'dinheiro'], 
 ARRAY['economic', 'finance', 'financial']),
 
('saude', 'Saúde', 'Temas de saúde e medicina', 1, '🏥', '#3B82F6',
 ARRAY['saúde', 'medicina', 'médico', 'tratamento'],
 ARRAY['health', 'medical', 'healthcare']),
 
('conhecimento', 'Conhecimento', 'Base de conhecimento institucional', 1, '📚', '#8B5CF6',
 ARRAY['conhecimento', 'documentação', 'manual'],
 ARRAY['knowledge', 'documentation']),
 
('ideias', 'Ideias', 'Inovação e desenvolvimento', 1, '💡', '#F59E0B',
 ARRAY['ideia', 'inovação', 'projeto', 'criativo'],
 ARRAY['ideas', 'innovation', 'creative']),
 
('sistema', 'Sistema', 'Configurações e metadados', 1, '⚙️', '#6B7280',
 ARRAY['sistema', 'configuração', 'admin'],
 ARRAY['system', 'config']),

('_pendente', 'Pendente', 'Documentos aguardando classificação', 1, '⏳', '#9CA3AF',
 ARRAY['pendente', 'aguardando', 'não classificado'],
 ARRAY['pending', 'unclassified'])
ON CONFLICT (code) DO NOTHING;

-- NÍVEL 2: Economia
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms) VALUES
('economia.indicadores', 'Indicadores', 
 (SELECT id FROM global_taxonomy WHERE code = 'economia'), 2,
 ARRAY['indicador', 'índice', 'taxa', 'métrica'],
 ARRAY['indicator', 'index', 'rate']),
 
('economia.mercados', 'Mercados',
 (SELECT id FROM global_taxonomy WHERE code = 'economia'), 2,
 ARRAY['mercado', 'bolsa', 'investimento'],
 ARRAY['market', 'stock', 'investment']),
 
('economia.setores', 'Setores',
 (SELECT id FROM global_taxonomy WHERE code = 'economia'), 2,
 ARRAY['setor', 'indústria', 'segmento'],
 ARRAY['sector', 'industry']),
 
('economia.geografico', 'Geográfico',
 (SELECT id FROM global_taxonomy WHERE code = 'economia'), 2,
 ARRAY['região', 'estado', 'país', 'uf'],
 ARRAY['region', 'state', 'country'])
ON CONFLICT (code) DO NOTHING;

-- NÍVEL 3: Indicadores Econômicos
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms) VALUES
('economia.indicadores.monetarios', 'Monetários',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.indicadores'), 3,
 ARRAY['selic', 'cdi', 'juros', 'taxa', 'monetário'],
 ARRAY['monetary', 'interest rate']),
 
('economia.indicadores.inflacao', 'Inflação',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.indicadores'), 3,
 ARRAY['ipca', 'igpm', 'inflação', 'preços', 'custo de vida'],
 ARRAY['inflation', 'prices', 'cpi']),
 
('economia.indicadores.emprego', 'Emprego',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.indicadores'), 3,
 ARRAY['desemprego', 'pnad', 'caged', 'trabalho', 'emprego'],
 ARRAY['employment', 'unemployment', 'jobs']),
 
('economia.indicadores.atividade', 'Atividade Econômica',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.indicadores'), 3,
 ARRAY['pib', 'pmc', 'pim', 'produção', 'atividade', 'varejo'],
 ARRAY['gdp', 'production', 'retail', 'activity'])
ON CONFLICT (code) DO NOTHING;

-- NÍVEL 3: Mercados
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms) VALUES
('economia.mercados.cambio', 'Câmbio',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.mercados'), 3,
 ARRAY['dólar', 'euro', 'ptax', 'moeda', 'câmbio'],
 ARRAY['exchange', 'forex', 'currency']),
 
('economia.mercados.acoes', 'Ações',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.mercados'), 3,
 ARRAY['ibovespa', 'b3', 'ação', 'bolsa', 'equity'],
 ARRAY['stocks', 'equity', 'shares']),
 
('economia.mercados.renda_fixa', 'Renda Fixa',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.mercados'), 3,
 ARRAY['tesouro', 'cdb', 'debênture', 'título', 'renda fixa'],
 ARRAY['fixed income', 'bonds', 'treasury'])
ON CONFLICT (code) DO NOTHING;

-- NÍVEL 4: Indicadores Específicos
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms) VALUES
('economia.indicadores.monetarios.selic', 'Taxa Selic',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.indicadores.monetarios'), 4,
 ARRAY['selic', 'meta selic', 'copom', 'taxa básica'],
 ARRAY['selic rate', 'base rate']),
 
('economia.indicadores.monetarios.cdi', 'CDI',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.indicadores.monetarios'), 4,
 ARRAY['cdi', 'certificado depósito', 'interbancário'],
 ARRAY['interbank rate']),

('economia.indicadores.inflacao.ipca', 'IPCA',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.indicadores.inflacao'), 4,
 ARRAY['ipca', 'ibge', 'inflação oficial', 'preços ao consumidor'],
 ARRAY['consumer prices', 'cpi brazil']),

('economia.indicadores.inflacao.igpm', 'IGP-M',
 (SELECT id FROM global_taxonomy WHERE code = 'economia.indicadores.inflacao'), 4,
 ARRAY['igpm', 'fgv', 'inflação geral'],
 ARRAY['general price index'])
ON CONFLICT (code) DO NOTHING;

-- NÍVEL 2: Saúde
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms) VALUES
('saude.especialidades', 'Especialidades',
 (SELECT id FROM global_taxonomy WHERE code = 'saude'), 2,
 ARRAY['especialidade', 'especialista', 'médico', 'clínica'],
 ARRAY['specialty', 'specialist']),
 
('saude.procedimentos', 'Procedimentos',
 (SELECT id FROM global_taxonomy WHERE code = 'saude'), 2,
 ARRAY['procedimento', 'exame', 'cirurgia', 'tratamento'],
 ARRAY['procedures', 'exams', 'surgery']),
 
('saude.prevencao', 'Prevenção',
 (SELECT id FROM global_taxonomy WHERE code = 'saude'), 2,
 ARRAY['prevenção', 'vacina', 'check-up', 'preventivo'],
 ARRAY['prevention', 'vaccine', 'checkup'])
ON CONFLICT (code) DO NOTHING;

-- NÍVEL 2: Conhecimento
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms) VALUES
('conhecimento.knowrisk', 'KnowRISK',
 (SELECT id FROM global_taxonomy WHERE code = 'conhecimento'), 2,
 ARRAY['knowrisk', 'risco', 'metodologia', 'análise de risco'],
 ARRAY['risk analysis', 'risk management']),
 
('conhecimento.knowyou', 'KnowYOU',
 (SELECT id FROM global_taxonomy WHERE code = 'conhecimento'), 2,
 ARRAY['knowyou', 'plataforma', 'agente', 'ia'],
 ARRAY['platform', 'agent', 'ai']),
 
('conhecimento.acc', 'ACC',
 (SELECT id FROM global_taxonomy WHERE code = 'conhecimento'), 2,
 ARRAY['acc', 'compliance', 'regulamentação', 'conformidade'],
 ARRAY['compliance', 'regulation'])
ON CONFLICT (code) DO NOTHING;

-- NÍVEL 2: Pendente
INSERT INTO global_taxonomy (code, name, parent_id, level, keywords, synonyms) VALUES
('_pendente.classificacao', 'Aguardando Classificação',
 (SELECT id FROM global_taxonomy WHERE code = '_pendente'), 2,
 ARRAY['não classificado', 'pendente', 'revisar'],
 ARRAY['unclassified', 'pending review'])
ON CONFLICT (code) DO NOTHING;