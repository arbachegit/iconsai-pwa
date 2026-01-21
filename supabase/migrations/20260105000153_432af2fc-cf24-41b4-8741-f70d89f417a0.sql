-- Adicionar textos de boas-vindas para cada módulo PWA
-- Usando 'text' como config_type (conforme constraint da tabela)

-- 1. Texto do módulo AJUDA
INSERT INTO pwa_config (config_key, config_value, config_type, description)
VALUES (
  'help_welcome_text',
  'Bem-vindo ao módulo de Ajuda! Aqui você aprende a usar todas as funcionalidades do KnowYOU. Siga os passos e toque em ouvir explicação para entender cada função.',
  'text',
  'Texto de apresentação reproduzido ao entrar no módulo Ajuda'
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- 2. Texto do módulo MUNDO
INSERT INTO pwa_config (config_key, config_value, config_type, description)
VALUES (
  'world_welcome_text',
  'Olá! Eu sou seu assistente de conhecimento geral. Pode me perguntar sobre qualquer assunto: ciência, história, tecnologia, cultura, ou curiosidades. Toque no microfone e faça sua pergunta!',
  'text',
  'Texto de apresentação reproduzido ao entrar no módulo Mundo'
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- 3. Texto do módulo SAÚDE
INSERT INTO pwa_config (config_key, config_value, config_type, description)
VALUES (
  'health_welcome_text',
  'Olá! Sou sua assistente de saúde. Vou te ajudar a entender melhor seus sintomas usando o protocolo OLDCARTS. Lembre-se: não substituo uma consulta médica. Toque no microfone para começar.',
  'text',
  'Texto de apresentação reproduzido ao entrar no módulo Saúde'
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- 4. Texto do módulo IDEIAS
INSERT INTO pwa_config (config_key, config_value, config_type, description)
VALUES (
  'ideas_welcome_text',
  'Olá! Sou seu consultor de ideias. Vou te ajudar a desenvolver e validar sua ideia de negócio usando a técnica do Advogado do Diabo. Vou fazer perguntas desafiadoras para fortalecer seu projeto. Toque no microfone e me conte sua ideia!',
  'text',
  'Texto de apresentação reproduzido ao entrar no módulo Ideias'
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- 5. Atualizar texto de boas-vindas da HOME (melhorado)
UPDATE pwa_config 
SET 
  config_value = 'Olá! Eu sou o KnowYOU, seu assistente de voz. Pode tocar no play quantas vezes quiser para ouvir novamente. Você tem quatro botões abaixo: Ajuda ensina como usar o aplicativo. Mundo responde perguntas sobre qualquer assunto. Saúde faz triagem dos seus sintomas. E Ideias ajuda a desenvolver e validar suas ideias de negócio. Quando estiver dentro de um módulo, toque no ícone de histórico para ver suas conversas anteriores. Escolha um botão para começar!',
  updated_at = NOW()
WHERE config_key = 'welcome_text';