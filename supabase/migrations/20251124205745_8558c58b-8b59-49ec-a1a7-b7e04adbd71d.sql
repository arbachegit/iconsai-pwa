-- Tabela de configurações do admin
CREATE TABLE admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_audio_enabled boolean DEFAULT true,
  auto_play_audio boolean DEFAULT true,
  gmail_api_configured boolean DEFAULT false,
  gmail_notification_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de conteúdo dos tooltips
CREATE TABLE tooltip_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  audio_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de analytics do chat
CREATE TABLE chat_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_name text,
  message_count integer DEFAULT 0,
  audio_plays integer DEFAULT 0,
  topics text[],
  started_at timestamptz DEFAULT now(),
  last_interaction timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooltip_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura (admin terá acesso via service role)
CREATE POLICY "Public can read admin settings" ON admin_settings FOR SELECT USING (true);
CREATE POLICY "Public can read tooltip contents" ON tooltip_contents FOR SELECT USING (is_active = true);
CREATE POLICY "Public can insert chat analytics" ON chat_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read own analytics" ON chat_analytics FOR SELECT USING (true);

-- Políticas de escrita (apenas service role via edge functions)
CREATE POLICY "Service role can update admin settings" ON admin_settings FOR UPDATE USING (true);
CREATE POLICY "Service role can manage tooltips" ON tooltip_contents FOR ALL USING (true);
CREATE POLICY "Service role can manage analytics" ON chat_analytics FOR UPDATE USING (true);

-- Inserir configuração padrão
INSERT INTO admin_settings (chat_audio_enabled, auto_play_audio, gmail_api_configured)
VALUES (true, true, false);

-- Inserir conteúdo inicial dos tooltips para cada seção
INSERT INTO tooltip_contents (section_id, title, content, is_active) VALUES
  ('software', 'A Era do Software', 'O software foi a primeira forma de comunicação entre humanos e máquinas. Através de linguagens como FORTRAN e COBOL, programadores traduziram a lógica humana em instruções que computadores podiam executar. Esta revolução permitiu automatizar cálculos complexos e abriu caminho para a era digital.', true),
  ('internet', 'A Revolução da Internet', 'A Internet conectou bilhões de pessoas, democratizando o acesso à informação e criando novas formas de comunicação instantânea que transformaram sociedades inteiras. Email, redes sociais e mensageiros mudaram permanentemente como nos comunicamos.', true),
  ('tech-sem-proposito', 'Tecnologias Sem Propósito Claro', 'Metaverso e NFTs geraram muito hype mas falharam em demonstrar valor real para a maioria dos usuários. São exemplos de tecnologia em busca de um problema para resolver. Nem toda inovação tecnológica se traduz em valor prático.', true),
  ('kubrick', 'A Visão de Kubrick em 1969', 'Em 2001: Uma Odisseia no Espaço (1968), Stanley Kubrick e Arthur C. Clarke imaginaram HAL 9000, uma IA com capacidade de fala natural. Esta visão antecipou em décadas o que vivemos hoje com assistentes de IA conversacionais.', true),
  ('watson', 'IBM Watson e a Era Cognitiva', 'Watson demonstrou que máquinas poderiam entender linguagem natural e competir com humanos em tarefas de conhecimento ao vencer o Jeopardy! em 2011. Foi um marco na evolução da IA cognitiva aplicada a domínios específicos como saúde e finanças.', true),
  ('ia-nova-era', 'A Nova Era da IA Generativa', 'Com ChatGPT e modelos similares, a barreira técnica para interagir com IA foi eliminada. Qualquer pessoa pode agora conversar naturalmente com sistemas inteligentes sem necessidade de conhecimento de programação ou comandos especiais.', true),
  ('knowyou', 'KnowYOU: IA Especializada em Saúde', 'KnowYOU aplica tecnologia conversacional avançada especificamente para o setor de saúde, capacitando profissionais a se comunicar efetivamente com IA. O foco está em criar valor real através de comunicação natural e contextualizada para healthcare.', true),
  ('bom-prompt', 'A Arte do Prompt Eficaz', 'Saber se comunicar com IA é uma habilidade essencial do século XXI. Prompts bem estruturados, específicos e contextualizados produzem resultados muito superiores. A qualidade da resposta depende diretamente da qualidade da pergunta.', true);

-- Criar índices para performance
CREATE INDEX idx_tooltip_section ON tooltip_contents(section_id);
CREATE INDEX idx_analytics_session ON chat_analytics(session_id);
CREATE INDEX idx_analytics_started ON chat_analytics(started_at DESC);