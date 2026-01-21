-- ============================================================
-- SQL: CRIAR TABELA phonetic_rules E POPULAR COM FONÉTICAS
-- Data: 2026_01_05 | Versão: 1.0.0
-- ============================================================

-- 1. Criar tabela de regras fonéticas
CREATE TABLE IF NOT EXISTS phonetic_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term VARCHAR(100) NOT NULL,
  phonetic VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'geral',
  region VARCHAR(50) DEFAULT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(term, region)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_phonetic_rules_term ON phonetic_rules(term);
CREATE INDEX IF NOT EXISTS idx_phonetic_rules_category ON phonetic_rules(category);
CREATE INDEX IF NOT EXISTS idx_phonetic_rules_region ON phonetic_rules(region);
CREATE INDEX IF NOT EXISTS idx_phonetic_rules_active ON phonetic_rules(is_active);

-- 3. Habilitar RLS
ALTER TABLE phonetic_rules ENABLE ROW LEVEL SECURITY;

-- 4. Criar política de leitura pública
CREATE POLICY "phonetic_rules_read_all" ON phonetic_rules
  FOR SELECT USING (true);

-- 5. Criar política de escrita para admins
CREATE POLICY "phonetic_rules_admin_all" ON phonetic_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('superadmin', 'admin')
    )
  );

-- ============================================================
-- INSERIR FONÉTICAS - ECONOMIA
-- ============================================================
INSERT INTO phonetic_rules (term, phonetic, category, description) VALUES
('PIB', 'pi-bi', 'economia', 'Produto Interno Bruto'),
('IPCA', 'ípeca', 'economia', 'Índice de Preços ao Consumidor Amplo'),
('IGP-M', 'igepê-ême', 'economia', 'Índice Geral de Preços do Mercado'),
('INPC', 'inepecê', 'economia', 'Índice Nacional de Preços ao Consumidor'),
('CDI', 'cedê-í', 'economia', 'Certificado de Depósito Interbancário'),
('PMC', 'peemecê', 'economia', 'Pesquisa Mensal de Comércio'),
('Selic', 'séliqui', 'economia', 'Sistema Especial de Liquidação e Custódia'),
('SELIC', 'séliqui', 'economia', 'Sistema Especial de Liquidação e Custódia (maiúsculo)'),
('PTAX', 'petáx', 'economia', 'Taxa de câmbio PTAX'),
('TR', 'têérre', 'economia', 'Taxa Referencial'),
('IOF', 'iôéfe', 'economia', 'Imposto sobre Operações Financeiras'),
('IR', 'iérre', 'economia', 'Imposto de Renda'),
('IRPF', 'iérrepêéfe', 'economia', 'Imposto de Renda Pessoa Física'),
('ICMS', 'icemésse', 'economia', 'Imposto sobre Circulação de Mercadorias'),
('IPI', 'ipí', 'economia', 'Imposto sobre Produtos Industrializados'),
('PIS', 'pís', 'economia', 'Programa de Integração Social'),
('COFINS', 'cofíns', 'economia', 'Contribuição para Financiamento da Seguridade Social')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- INSERIR FONÉTICAS - INSTITUIÇÕES
-- ============================================================
INSERT INTO phonetic_rules (term, phonetic, category, description) VALUES
('BCB', 'becebê', 'instituicoes', 'Banco Central do Brasil'),
('BACEN', 'bacém', 'instituicoes', 'Banco Central (abreviação)'),
('COPOM', 'copóm', 'instituicoes', 'Comitê de Política Monetária'),
('CMN', 'ceemêne', 'instituicoes', 'Conselho Monetário Nacional'),
('CVM', 'cevêeme', 'instituicoes', 'Comissão de Valores Mobiliários'),
('BNDES', 'beenedéesse', 'instituicoes', 'Banco Nacional de Desenvolvimento'),
('IBGE', 'ibegê', 'instituicoes', 'Instituto Brasileiro de Geografia e Estatística'),
('IPEA', 'ipéa', 'instituicoes', 'Instituto de Pesquisa Econômica Aplicada'),
('FGV', 'efegêvê', 'instituicoes', 'Fundação Getúlio Vargas'),
('FIPE', 'fípi', 'instituicoes', 'Fundação Instituto de Pesquisas Econômicas'),
('DIEESE', 'diêsse', 'instituicoes', 'Departamento Intersindical de Estatística'),
('CAGED', 'cajéd', 'instituicoes', 'Cadastro Geral de Empregados e Desempregados'),
('INSS', 'inêssi', 'instituicoes', 'Instituto Nacional do Seguro Social'),
('FGTS', 'efegêtêesse', 'instituicoes', 'Fundo de Garantia do Tempo de Serviço'),
('CLT', 'cêeletê', 'instituicoes', 'Consolidação das Leis do Trabalho'),
('MEI', 'mêi', 'instituicoes', 'Microempreendedor Individual'),
('CNPJ', 'ceenepêjóta', 'instituicoes', 'Cadastro Nacional da Pessoa Jurídica'),
('CPF', 'cêpêéfe', 'instituicoes', 'Cadastro de Pessoa Física')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- INSERIR FONÉTICAS - MERCADO FINANCEIRO
-- ============================================================
INSERT INTO phonetic_rules (term, phonetic, category, description) VALUES
('IPO', 'ipô', 'mercado_financeiro', 'Initial Public Offering'),
('ETF', 'ítêéfe', 'mercado_financeiro', 'Exchange Traded Fund'),
('CDB', 'cedêbê', 'mercado_financeiro', 'Certificado de Depósito Bancário'),
('LCI', 'élecêí', 'mercado_financeiro', 'Letra de Crédito Imobiliário'),
('LCA', 'élecêá', 'mercado_financeiro', 'Letra de Crédito do Agronegócio'),
('FII', 'fiî', 'mercado_financeiro', 'Fundo de Investimento Imobiliário'),
('NTN', 'ênetêene', 'mercado_financeiro', 'Nota do Tesouro Nacional')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- INSERIR FONÉTICAS - INTERNACIONAIS
-- ============================================================
INSERT INTO phonetic_rules (term, phonetic, category, description) VALUES
('FMI', 'éfemí', 'internacional', 'Fundo Monetário Internacional'),
('ONU', 'onú', 'internacional', 'Organização das Nações Unidas'),
('OMC', 'ômecê', 'internacional', 'Organização Mundial do Comércio'),
('OCDE', 'ócedê', 'internacional', 'Organização para Cooperação e Desenvolvimento'),
('BCE', 'becê', 'internacional', 'Banco Central Europeu'),
('FED', 'féd', 'internacional', 'Federal Reserve'),
('G20', 'gê vínti', 'internacional', 'Grupo dos 20'),
('BRICS', 'brícs', 'internacional', 'Brasil, Rússia, Índia, China, África do Sul'),
('EUA', 'êuá', 'internacional', 'Estados Unidos da América')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- INSERIR FONÉTICAS - MOEDAS
-- ============================================================
INSERT INTO phonetic_rules (term, phonetic, category, description) VALUES
('USD', 'dólar', 'moedas', 'Dólar americano'),
('BRL', 'real', 'moedas', 'Real brasileiro'),
('EUR', 'êuro', 'moedas', 'Euro'),
('GBP', 'líbra', 'moedas', 'Libra esterlina'),
('JPY', 'iêne', 'moedas', 'Iene japonês'),
('CNY', 'iuãn', 'moedas', 'Yuan chinês'),
('ARS', 'peso argentino', 'moedas', 'Peso argentino')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- INSERIR FONÉTICAS - TECNOLOGIA
-- ============================================================
INSERT INTO phonetic_rules (term, phonetic, category, description) VALUES
('IA', 'iá', 'tecnologia', 'Inteligência Artificial'),
('AI', 'êi ái', 'tecnologia', 'Artificial Intelligence'),
('API', 'apí', 'tecnologia', 'Application Programming Interface'),
('PDF', 'pedêéfe', 'tecnologia', 'Portable Document Format'),
('URL', 'urél', 'tecnologia', 'Uniform Resource Locator'),
('HTML', 'agá-tê-ême-éle', 'tecnologia', 'HyperText Markup Language'),
('CSS', 'cê-ésse-ésse', 'tecnologia', 'Cascading Style Sheets'),
('SQL', 'ésse-quê-éle', 'tecnologia', 'Structured Query Language'),
('GPS', 'gê-pê-ésse', 'tecnologia', 'Global Positioning System'),
('USB', 'ú-ésse-bê', 'tecnologia', 'Universal Serial Bus'),
('WiFi', 'uái-fái', 'tecnologia', 'Wireless Fidelity'),
('SaaS', 'sás', 'tecnologia', 'Software as a Service'),
('IoT', 'iôt', 'tecnologia', 'Internet of Things'),
('ML', 'êm-éle', 'tecnologia', 'Machine Learning'),
('LLM', 'éle-éle-ême', 'tecnologia', 'Large Language Model'),
('NLP', 'êne-éle-pê', 'tecnologia', 'Natural Language Processing'),
('RAG', 'rág', 'tecnologia', 'Retrieval Augmented Generation')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- INSERIR FONÉTICAS - TERMOS EM INGLÊS
-- ============================================================
INSERT INTO phonetic_rules (term, phonetic, category, description) VALUES
('spread', 'sprééd', 'ingles', 'Diferença entre preços'),
('hedge', 'hédji', 'ingles', 'Proteção financeira'),
('swap', 'suóp', 'ingles', 'Troca de ativos'),
('default', 'defólt', 'ingles', 'Inadimplência'),
('rating', 'rêitin', 'ingles', 'Classificação de risco'),
('benchmark', 'bêntchmark', 'ingles', 'Referência de mercado'),
('commodities', 'comóditis', 'ingles', 'Mercadorias básicas'),
('commodity', 'comóditi', 'ingles', 'Mercadoria básica'),
('target', 'târguet', 'ingles', 'Meta/Alvo'),
('stop', 'istóp', 'ingles', 'Parada'),
('day trade', 'dêi trêid', 'ingles', 'Operação de curto prazo'),
('home broker', 'hôme brôker', 'ingles', 'Plataforma de investimentos'),
('startup', 'stártâp', 'ingles', 'Empresa nascente'),
('feedback', 'fídbéc', 'ingles', 'Retorno/Resposta'),
('insight', 'ínsait', 'ingles', 'Percepção'),
('dashboard', 'déshbôrd', 'ingles', 'Painel de controle'),
('workflow', 'uôrcflôu', 'ingles', 'Fluxo de trabalho'),
('mindset', 'máindset', 'ingles', 'Mentalidade'),
('brainstorm', 'brêinstôrm', 'ingles', 'Tempestade de ideias')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- INSERIR FONÉTICAS - SÍMBOLOS E ESPECIAIS
-- ============================================================
INSERT INTO phonetic_rules (term, phonetic, category, description) VALUES
('R$', 'reais', 'simbolos', 'Símbolo do Real'),
('%', 'por cento', 'simbolos', 'Símbolo de porcentagem'),
('&', 'e', 'simbolos', 'E comercial'),
('@', 'arroba', 'simbolos', 'Símbolo de arroba'),
('#', 'hashtag', 'simbolos', 'Símbolo de hashtag'),
('/', 'barra', 'simbolos', 'Barra'),
('+', 'mais', 'simbolos', 'Sinal de mais'),
('-', 'menos', 'simbolos', 'Sinal de menos'),
('=', 'igual', 'simbolos', 'Sinal de igual'),
('°C', 'graus celsius', 'simbolos', 'Graus Celsius'),
('°F', 'graus fahrenheit', 'simbolos', 'Graus Fahrenheit'),
('km', 'quilômetros', 'simbolos', 'Quilômetros'),
('kg', 'quilogramas', 'simbolos', 'Quilogramas'),
('m²', 'metros quadrados', 'simbolos', 'Metros quadrados'),
('m³', 'metros cúbicos', 'simbolos', 'Metros cúbicos')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- INSERIR FONÉTICAS - KNOWYOU
-- ============================================================
INSERT INTO phonetic_rules (term, phonetic, category, description) VALUES
('KnowYOU', 'nôu iú', 'knowyou', 'Nome do produto'),
('KnowRISK', 'nôu rísk', 'knowyou', 'Nome da empresa'),
('OLDCARTS', 'ôld carts', 'knowyou', 'Protocolo de triagem médica')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- INSERIR FONÉTICAS - REGIONAIS BRASILEIRAS
-- ============================================================

-- REGIÃO NORTE
INSERT INTO phonetic_rules (term, phonetic, category, region, description) VALUES
('você', 'tu', 'regional', 'norte', 'Pronome pessoal - Norte'),
('não é', 'né não', 'regional', 'norte', 'Expressão de confirmação - Norte'),
('menino', 'mano', 'regional', 'norte', 'Forma de tratamento - Norte'),
('muito', 'mó', 'regional', 'norte', 'Intensificador - Norte'),
('legal', 'massa', 'regional', 'norte', 'Expressão de aprovação - Norte')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  description = EXCLUDED.description,
  updated_at = NOW();

-- REGIÃO NORDESTE
INSERT INTO phonetic_rules (term, phonetic, category, region, description) VALUES
('você', 'tu/ocê', 'regional', 'nordeste', 'Pronome pessoal - Nordeste'),
('não é', 'é não', 'regional', 'nordeste', 'Expressão de confirmação - Nordeste'),
('menino', 'mêi', 'regional', 'nordeste', 'Forma de tratamento - Nordeste'),
('legal', 'arretado', 'regional', 'nordeste', 'Expressão de aprovação - Nordeste'),
('bom', 'bão', 'regional', 'nordeste', 'Adjetivo - Nordeste'),
('rapaz', 'rapá', 'regional', 'nordeste', 'Forma de tratamento - Nordeste'),
('mulher', 'muié', 'regional', 'nordeste', 'Substantivo - Nordeste'),
('também', 'tamém', 'regional', 'nordeste', 'Advérbio - Nordeste')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  description = EXCLUDED.description,
  updated_at = NOW();

-- REGIÃO CENTRO-OESTE
INSERT INTO phonetic_rules (term, phonetic, category, region, description) VALUES
('você', 'cê', 'regional', 'centro-oeste', 'Pronome pessoal - Centro-Oeste'),
('não é', 'uai', 'regional', 'centro-oeste', 'Expressão de confirmação - Centro-Oeste'),
('muito', 'trem', 'regional', 'centro-oeste', 'Intensificador genérico - Centro-Oeste'),
('bom', 'bão demais', 'regional', 'centro-oeste', 'Adjetivo - Centro-Oeste')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  description = EXCLUDED.description,
  updated_at = NOW();

-- REGIÃO SUDESTE - SÃO PAULO
INSERT INTO phonetic_rules (term, phonetic, category, region, description) VALUES
('você', 'cê', 'regional', 'sudeste-sp', 'Pronome pessoal - São Paulo'),
('não é', 'né', 'regional', 'sudeste-sp', 'Expressão de confirmação - São Paulo'),
('menino', 'mano', 'regional', 'sudeste-sp', 'Forma de tratamento - São Paulo'),
('legal', 'da hora', 'regional', 'sudeste-sp', 'Expressão de aprovação - São Paulo'),
('cara', 'mano', 'regional', 'sudeste-sp', 'Forma de tratamento informal - São Paulo'),
('muito', 'mó', 'regional', 'sudeste-sp', 'Intensificador - São Paulo')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  description = EXCLUDED.description,
  updated_at = NOW();

-- REGIÃO SUDESTE - RIO DE JANEIRO
INSERT INTO phonetic_rules (term, phonetic, category, region, description) VALUES
('você', 'tu', 'regional', 'sudeste-rj', 'Pronome pessoal - Rio de Janeiro'),
('não é', 'né', 'regional', 'sudeste-rj', 'Expressão de confirmação - Rio de Janeiro'),
('menino', 'moleque', 'regional', 'sudeste-rj', 'Forma de tratamento - Rio de Janeiro'),
('legal', 'sinistro', 'regional', 'sudeste-rj', 'Expressão de aprovação - Rio de Janeiro'),
('cara', 'parceiro', 'regional', 'sudeste-rj', 'Forma de tratamento informal - Rio de Janeiro'),
('entendeu', 'entendeu, mermão', 'regional', 'sudeste-rj', 'Expressão de confirmação - Rio de Janeiro'),
('isso', 'isso aí, mano', 'regional', 'sudeste-rj', 'Expressão de concordância - Rio de Janeiro')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  description = EXCLUDED.description,
  updated_at = NOW();

-- REGIÃO SUDESTE - MINAS GERAIS
INSERT INTO phonetic_rules (term, phonetic, category, region, description) VALUES
('você', 'ocê', 'regional', 'sudeste-mg', 'Pronome pessoal - Minas Gerais'),
('não é', 'uai', 'regional', 'sudeste-mg', 'Expressão típica - Minas Gerais'),
('muito', 'trem bão', 'regional', 'sudeste-mg', 'Expressão de aprovação - Minas Gerais'),
('legal', 'bão demais', 'regional', 'sudeste-mg', 'Expressão de aprovação - Minas Gerais'),
('coisa', 'trem', 'regional', 'sudeste-mg', 'Substantivo genérico - Minas Gerais'),
('está', 'tá', 'regional', 'sudeste-mg', 'Verbo estar - Minas Gerais'),
('para', 'pra', 'regional', 'sudeste-mg', 'Preposição - Minas Gerais'),
('pão de queijo', 'pão di queijo', 'regional', 'sudeste-mg', 'Comida típica - Minas Gerais')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  description = EXCLUDED.description,
  updated_at = NOW();

-- REGIÃO SUL
INSERT INTO phonetic_rules (term, phonetic, category, region, description) VALUES
('você', 'tu', 'regional', 'sul', 'Pronome pessoal - Sul'),
('não é', 'né tchê', 'regional', 'sul', 'Expressão de confirmação - Sul'),
('menino', 'guri', 'regional', 'sul', 'Forma de tratamento masculino - Sul'),
('menina', 'guria', 'regional', 'sul', 'Forma de tratamento feminino - Sul'),
('legal', 'tri legal', 'regional', 'sul', 'Expressão de aprovação - Sul'),
('muito', 'barbaridade', 'regional', 'sul', 'Intensificador - Sul'),
('sim', 'bah', 'regional', 'sul', 'Expressão de confirmação - Sul'),
('chimarrão', 'chimarrão', 'regional', 'sul', 'Bebida típica - Sul'),
('tchê', 'tchê', 'regional', 'sul', 'Interjeição típica - Sul')
ON CONFLICT (term, region) DO UPDATE SET
  phonetic = EXCLUDED.phonetic,
  description = EXCLUDED.description,
  updated_at = NOW();