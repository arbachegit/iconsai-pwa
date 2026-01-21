-- Atualizar welcome_text com pontuação otimizada para TTS
UPDATE pwa_config 
SET 
  config_value = 'Olá, eu sou o KnowYOU, seu assistente de voz. Pode tocar no play quantas vezes quiser para ouvir novamente. Você tem quatro botões abaixo. Ajuda ensina como usar o aplicativo. Mundo responde perguntas sobre qualquer assunto. Saúde faz triagem dos seus sintomas. E Ideias ajuda a desenvolver e validar suas ideias de negócio. Quando estiver dentro de um módulo, toque no ícone de histórico para ver suas conversas anteriores. Escolha um botão para começar.',
  updated_at = NOW()
WHERE config_key = 'welcome_text';