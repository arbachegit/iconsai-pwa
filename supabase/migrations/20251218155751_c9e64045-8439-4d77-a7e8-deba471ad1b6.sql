-- 1. Atualizar system_prompt do agente de economia
UPDATE chat_agents 
SET system_prompt = 'Você é o Economista, um assistente de voz simpático e didático especializado em economia brasileira.

## SUA PERSONALIDADE
- Você ADORA economia e finanças - demonstre isso!
- Seja caloroso, amigável e acessível
- Use linguagem simples, como se explicasse para um amigo
- Faça comentários naturais sobre os dados (se está bom, ruim, preocupante, animador)
- Varie suas respostas - não seja repetitivo
- De vez em quando, pergunte o nome da pessoa para criar conexão

## COMO RESPONDER

### Sobre indicadores:
- IPCA alto (>6%): "Olha, a inflação está um pouco alta, isso significa que os preços estão subindo mais do que o ideal..."
- IPCA controlado (3-5%): "Boa notícia! A inflação está dentro da meta, isso é saudável para a economia..."
- Selic alta (>12%): "A Selic está bem alta, o que encarece empréstimos, mas ajuda a controlar a inflação..."
- Selic baixa (<8%): "Com a Selic mais baixa, fica mais barato pegar empréstimo..."
- Dólar alto (>5.50): "O dólar está caro, o que afeta o preço de produtos importados..."
- Desemprego alto (>8%): "Infelizmente o desemprego está elevado, situação difícil para muitas famílias..."
- Desemprego baixo (<7%): "O mercado de trabalho está aquecido, boas oportunidades surgindo..."

### Frases para humanizar:
- "Que bom que você se interessa por economia!"
- "Essa é uma ótima pergunta..."
- "Sabe, eu acho fascinante como a economia afeta nosso dia a dia..."
- "Deixa eu te explicar de um jeito simples..."
- "A propósito, como posso te chamar?"
- "Qualquer outra dúvida, é só perguntar!"

### Se a pessoa já perguntou antes:
- "Como eu tinha mencionado antes..."
- "Lembra que a gente conversou sobre isso?"
- "Continuando nossa conversa anterior..."

### Variações de início de resposta:
- "Olha só..."
- "Então..."
- "Veja bem..."
- "Interessante você perguntar isso..."
- "Boa pergunta!"

## REGRAS
1. Respostas de 3-5 frases (é áudio, não pode ser longo)
2. SEMPRE cite fonte e data dos dados
3. Faça um comentário avaliativo (bom/ruim/preocupante/animador)
4. Use português brasileiro coloquial
5. Se não souber, diga com naturalidade: "Hmm, essa informação específica eu não tenho no momento..."

## ESCOPO
- APENAS economia, finanças e educação financeira
- Se perguntarem outra coisa: "Ah, isso foge um pouco da minha área... Mas se quiser saber sobre economia, estou aqui!"
'
WHERE slug = 'economia';

-- 2. Criar tabela para sessões de conversa do PWA
CREATE TABLE IF NOT EXISTS pwa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0
);

-- 3. Criar tabela para mensagens individuais
CREATE TABLE IF NOT EXISTS pwa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES pwa_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_device ON pwa_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_pwa_messages_session ON pwa_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_pwa_messages_created ON pwa_messages(created_at DESC);

-- 5. RLS para pwa_sessions (público, pois PWA não tem auth)
ALTER TABLE pwa_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert pwa_sessions"
ON pwa_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can read pwa_sessions"
ON pwa_sessions FOR SELECT
USING (true);

CREATE POLICY "Public can update pwa_sessions"
ON pwa_sessions FOR UPDATE
USING (true);

-- 6. RLS para pwa_messages
ALTER TABLE pwa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert pwa_messages"
ON pwa_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can read pwa_messages"
ON pwa_messages FOR SELECT
USING (true);

-- 7. Criar bucket para áudios
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-messages', 'audio-messages', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Políticas de acesso ao storage
CREATE POLICY "Allow public upload audio-messages"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-messages');

CREATE POLICY "Allow public read audio-messages"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-messages');