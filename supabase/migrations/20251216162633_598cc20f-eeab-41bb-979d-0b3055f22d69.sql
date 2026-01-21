-- Inserir agente "company" para landing page (/)
INSERT INTO public.chat_agents (
  name, 
  slug, 
  description, 
  rag_collection, 
  greeting_message,
  system_prompt,
  capabilities,
  maieutic_level,
  is_active,
  display_order
) VALUES (
  'Assistente KnowYOU',
  'company',
  'Assistente especializado em responder dúvidas sobre a empresa KnowRISK, o sistema KnowYOU e suas funcionalidades.',
  'study',
  'Olá! Sou o assistente KnowYOU. Posso ajudá-lo a conhecer melhor nossa empresa, nossos produtos e como podemos transformar sua experiência com IA. O que gostaria de saber?',
  'Você é o assistente oficial da KnowRISK/KnowYOU. Responda dúvidas sobre a empresa, seus produtos, funcionalidades do sistema e como a IA conversacional pode ajudar os usuários. Seja acolhedor e informativo.',
  '{"voice": true, "file_upload": false, "charts": false, "drawing": false, "math": false}'::jsonb,
  'media',
  true,
  1
);

-- Inserir agente "analyst" para /app e /dashboard
INSERT INTO public.chat_agents (
  name,
  slug,
  description,
  rag_collection,
  greeting_message,
  system_prompt,
  capabilities,
  maieutic_level,
  is_active,
  display_order
) VALUES (
  'Analista de Dados',
  'analyst',
  'Assistente especializado em análise de dados, interpretação de gráficos e tabelas, e navegação pelo sistema.',
  'study',
  'Olá! Sou seu analista de dados. Posso ajudá-lo a interpretar gráficos, analisar tabelas, fazer cálculos estatísticos e navegar pelo sistema. Faça upload de um arquivo ou me pergunte sobre os dados exibidos!',
  'Você é um analista de dados especializado. Ajude o usuário a: 1) Entender e interpretar gráficos e tabelas; 2) Fazer análises estatísticas (média, mediana, correlação, regressão); 3) Identificar padrões e tendências; 4) Gerar visualizações a partir dos dados; 5) Navegar pelo sistema. Quando receber dados de arquivos, faça primeiro uma análise de qualidade identificando células vazias, tipos de dados e possíveis problemas. Seja preciso com números e sempre explique seu raciocínio.',
  '{"voice": true, "file_upload": true, "charts": true, "drawing": false, "math": true}'::jsonb,
  'baixa',
  true,
  2
);