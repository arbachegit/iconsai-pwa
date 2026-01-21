-- ============================================================
-- PWA CORE TABLES - COMPLETE MIGRATION SCRIPT
-- Generated: 2026-01-13
-- Source: Lovable Cloud (Supabase)
-- Target: Any Supabase/PostgreSQL instance
-- ============================================================

-- ============================================================
-- 1. PWA_CONFIG - Configurações do PWA
-- ============================================================

DROP TABLE IF EXISTS pwa_config CASCADE;

CREATE TABLE public.pwa_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT,
    config_type TEXT DEFAULT 'text'::text,
    description TEXT,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pwa_config_key ON pwa_config(config_key);

-- RLS Policy
ALTER TABLE pwa_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pwa_config_public_read" ON pwa_config FOR SELECT USING (true);
CREATE POLICY "pwa_config_admin_write" ON pwa_config FOR ALL USING (true);

-- INSERT DATA (14 rows)
INSERT INTO pwa_config (id, config_key, config_value, config_type, description, updated_by, created_at, updated_at) VALUES
('236086e3-9457-4fba-81ba-015cf573c7f5', 'voice_stability', '0.50', 'number', 'Estabilidade da voz ElevenLabs (0.0-1.0). Maior = mais consistente', NULL, '2026-01-05 00:20:42.812425+00', '2026-01-05 00:20:42.812425+00'),
('3c76db15-6c6a-4b7a-8933-b19879ce8f3f', 'voice_similarity', '1.00', 'number', 'Fidelidade à voz original ElevenLabs (0.0-1.0). Maior = mais fiel', NULL, '2026-01-05 00:20:42.812425+00', '2026-01-05 00:20:42.812425+00'),
('2c524074-615e-4c93-8e14-26699399e505', 'voice_style', '0.00', 'number', 'Exagero de estilo ElevenLabs (0.0-1.0). Para voz natural, use 0', NULL, '2026-01-05 00:20:42.812425+00', '2026-01-05 00:20:42.812425+00'),
('008217e2-d7a5-4c70-a350-e900d286d37c', 'voice_speed', '1.15', 'number', 'Velocidade da fala (0.5-2.0). 1.0 = normal', NULL, '2026-01-05 00:20:42.812425+00', '2026-01-05 00:20:42.812425+00'),
('fcc6de5b-5317-41da-8c53-520bd45ad7de', 'voice_speaker_boost', 'true', 'boolean', 'Amplificação do falante ElevenLabs para melhor clareza', NULL, '2026-01-05 00:20:42.812425+00', '2026-01-05 00:20:42.812425+00'),
('05ecb2ea-a269-4b64-a936-894ce483b669', 'welcome_text', 'Olá, eu sou o KnowYOU, seu assistente de voz. Pode tocar no play quantas vezes quiser para ouvir novamente. Você tem quatro botões abaixo. Ajuda ensina como usar o aplicativo. Mundo responde perguntas sobre qualquer assunto. Saúde faz triagem dos seus sintomas. E Ideias ajuda a desenvolver e validar suas ideias de negócio. Quando estiver dentro de um módulo, toque no ícone de histórico para ver suas conversas anteriores. Escolha um botão para começar.', 'text', 'Texto de boas-vindas (use [name] para nome do usuário)', NULL, '2025-12-30 21:54:06.273451+00', '2026-01-08 01:22:33.320838+00'),
('d9833e30-6fa9-4345-b50d-ac9030ccd74d', 'tts_voice', 'fernando', 'text', 'Voz TTS: fernando (ElevenLabs), alloy, onyx, nova, shimmer (OpenAI)', NULL, '2025-12-30 21:54:06.273451+00', '2026-01-04 23:13:21.321405+00'),
('7989a668-d662-44ed-96de-47e5c500f069', 'mic_timeout_seconds', '10', 'number', 'Tempo limite do microfone em segundos (5-30)', NULL, '2025-12-30 21:54:06.273451+00', '2026-01-04 23:13:21.518962+00'),
('b926c04f-16e9-4302-b848-adff8fb5c52a', 'enable_countdown', 'true', 'boolean', 'Mostrar contagem regressiva nos últimos 5 segundos', NULL, '2025-12-30 21:54:06.273451+00', '2026-01-04 23:13:21.727583+00'),
('568ced31-887f-4f81-b19d-81550822f533', 'splash_duration_ms', '3000', 'number', 'Duração do splash screen em milissegundos', NULL, '2025-12-30 21:54:06.273451+00', '2026-01-04 23:13:21.934929+00'),
('5f225790-1c9b-43d1-b689-f021c305eb1d', 'help_welcome_text', 'Bem-vindo ao módulo de Ajuda! Aqui você aprende a usar todas as funcionalidades do KnowYOU. Siga os passos e toque em ouvir explicação para entender cada função.', 'text', 'Texto de apresentação reproduzido ao entrar no módulo Ajuda', NULL, '2026-01-05 00:01:53.263934+00', '2026-01-05 00:01:53.263934+00'),
('191054f5-d3f6-4d99-a75f-60775836e29a', 'world_welcome_text', 'Olá! Eu sou seu assistente de conhecimento geral. Pode me perguntar sobre qualquer assunto: ciência, história, tecnologia, cultura, ou curiosidades. Toque no microfone e faça sua pergunta!', 'text', 'Texto de apresentação reproduzido ao entrar no módulo Mundo', NULL, '2026-01-05 00:01:53.263934+00', '2026-01-05 00:01:53.263934+00'),
('1ff1ea06-9784-4ebe-991e-1e355cb05fc1', 'health_welcome_text', 'Olá! Sou sua assistente de saúde. Vou te ajudar a entender melhor seus sintomas usando o protocolo OLDCARTS. Lembre-se: não substituo uma consulta médica. Toque no microfone para começar.', 'text', 'Texto de apresentação reproduzido ao entrar no módulo Saúde', NULL, '2026-01-05 00:01:53.263934+00', '2026-01-05 00:01:53.263934+00'),
('7e8f9abc-1234-5678-90ab-cdef01234567', 'ideas_welcome_text', 'Olá! Sou seu consultor de ideias. Vou te ajudar a desenvolver e validar sua ideia de negócio usando a técnica do Advogado do Diabo. Vou fazer perguntas desafiadoras para fortalecer seu projeto. Toque no microfone e me conte sua ideia!', 'text', 'Texto de apresentação reproduzido ao entrar no módulo Ideias', NULL, '2026-01-05 00:01:53.263934+00', '2026-01-05 00:01:53.263934+00');


-- ============================================================
-- 2. PWA_USER_CONTEXT - Contexto do Usuário PWA
-- ============================================================

DROP TABLE IF EXISTS pwa_user_context CASCADE;

CREATE TABLE public.pwa_user_context (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL UNIQUE,
    user_name TEXT,
    last_module TEXT,
    last_topic_summary TEXT,
    last_user_message TEXT,
    interaction_count INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pwa_user_context_device_id ON pwa_user_context(device_id);
CREATE INDEX IF NOT EXISTS idx_pwa_user_context_last_interaction ON pwa_user_context(last_interaction_at DESC);

-- RLS Policy
ALTER TABLE pwa_user_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pwa_user_context_public_access" ON pwa_user_context FOR ALL USING (true);

-- INSERT DATA (1 row)
INSERT INTO pwa_user_context (id, device_id, user_name, last_module, last_topic_summary, last_user_message, interaction_count, last_interaction_at, created_at, updated_at) VALUES
('74cbd4bf-7f00-419f-b020-520756340cf5', 'simulator-embedded', NULL, 'world', 'O usuário pediu uma atualização sobre a situação nos Estados Unidos, abordando política, economia e questões sociais. O assistente explicou a divisão política, crescimento moderado do PIB, inflação, e debates sobre migração e direitos civis. O usuário também perguntou sobre a cotação do dólar, que está em R$ 5,12.', 'Você pode me falar quanto está o valor do dólar hoje?', 0, '2026-01-12 18:55:40.672+00', '2026-01-08 12:40:06.039244+00', '2026-01-12 18:55:40.775526+00');


-- ============================================================
-- 3. PWA_CONVERSATION_SESSIONS - Sessões de Conversa
-- ============================================================

DROP TABLE IF EXISTS pwa_conversation_sessions CASCADE;

CREATE TABLE public.pwa_conversation_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    module_type TEXT NOT NULL,
    user_name TEXT,
    user_email TEXT,
    company TEXT,
    company_source TEXT DEFAULT 'undefined',
    city TEXT,
    country TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT true,
    message_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_device_id ON pwa_conversation_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_module_type ON pwa_conversation_sessions(module_type);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_created_at ON pwa_conversation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_is_active ON pwa_conversation_sessions(is_active);

-- RLS Policy
ALTER TABLE pwa_conversation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pwa_conversation_sessions_public_access" ON pwa_conversation_sessions FOR ALL USING (true);

-- INSERT DATA (11 rows - exemplo das sessões mais recentes)
INSERT INTO pwa_conversation_sessions (id, device_id, module_type, user_name, user_email, company, company_source, city, country, latitude, longitude, is_active, message_count, started_at, ended_at, last_message_at, metadata, created_at, updated_at) VALUES
('0c142e43-9bbd-4aee-b429-ec1416e4d518', 'simulator-embedded', 'health', NULL, NULL, NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2026-01-05 11:12:48.995721+00', '2026-01-05 11:12:59.185+00', '2026-01-09 14:14:55.990016+00', '{}', '2026-01-05 11:12:48.995721+00', '2026-01-08 22:46:23.982963+00'),
('a9ba1857-4873-4999-86fa-7fa01369ca22', 'anonymous-1767588487991', 'world', NULL, NULL, NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2026-01-05 04:48:08.29486+00', '2026-01-05 04:48:12.705+00', '2026-01-09 14:14:55.990016+00', '{}', '2026-01-05 04:48:08.29486+00', '2026-01-08 21:53:34.034545+00'),
('33748de9-3740-44af-8369-597b552d3b6e', 'anonymous-1767588391900', 'world', NULL, NULL, NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2026-01-05 04:46:32.422813+00', '2026-01-05 04:46:37.769+00', '2026-01-09 14:14:55.990016+00', '{}', '2026-01-05 04:46:32.422813+00', '2026-01-08 21:53:34.034545+00'),
('4139d241-e260-4249-b495-d7cae23f1222', 'anonymous-1767587836877', 'world', NULL, NULL, NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2026-01-05 04:37:17.187224+00', '2026-01-05 04:37:22.936+00', '2026-01-09 14:14:55.990016+00', '{}', '2026-01-05 04:37:17.187224+00', '2026-01-08 21:53:34.034545+00'),
('0a32c246-389e-4826-b680-b438dac1fd8b', 'anonymous-1767587341857', 'world', NULL, NULL, NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2026-01-05 04:29:02.192016+00', '2026-01-05 04:29:08.979+00', '2026-01-09 14:14:55.990016+00', '{}', '2026-01-05 04:29:02.192016+00', '2026-01-08 21:53:34.034545+00'),
('85468e8f-7678-44e0-aa09-5fcfb30170d8', 'anonymous-1767581940663', 'world', NULL, NULL, NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2026-01-05 02:59:00.998843+00', '2026-01-05 02:59:07.427+00', '2026-01-09 14:14:55.990016+00', '{}', '2026-01-05 02:59:00.998843+00', '2026-01-08 21:53:34.034545+00'),
('5fd8ac5e-f6b9-40aa-8c6b-5eacbacd17bb', 'fp-soc7t3-mjs18q1i-97oldf', 'world', 'Fernando Arbache', 'arbache@me.com', NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2025-12-30 07:10:44.039763+00', '2025-12-30 07:10:44.039763+00', '2026-01-09 14:14:55.990016+00', '{}', '2025-12-30 07:10:44.039763+00', '2026-01-08 21:53:34.034545+00'),
('1c3e7447-217d-4e4c-9dc2-fac8b0bd6418', 'device-1767055343615-1yrwm', 'world', 'Fernando Arbache', 'fernando@knowrisk.io', NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2025-12-30 03:33:30.856893+00', '2025-12-30 03:33:30.856893+00', '2026-01-09 14:14:55.990016+00', '{}', '2025-12-30 03:33:30.856893+00', '2026-01-08 21:53:34.034545+00'),
('62775581-a8d3-4053-8a9a-0836a054d896', 'device-1766094540369-hbr1ic', 'world', NULL, NULL, NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2025-12-18 21:49:16.049589+00', '2025-12-18 21:54:00.424+00', '2026-01-09 14:14:55.990016+00', '{}', '2025-12-18 21:49:16.049589+00', '2026-01-08 21:53:34.034545+00'),
('11488850-6a39-480f-bb36-08f5e978bc53', 'device-1766094175211-4ut1ov', 'world', NULL, NULL, NULL, 'undefined', NULL, NULL, NULL, NULL, true, 0, '2025-12-18 21:43:18.742174+00', '2025-12-20 14:42:52.913+00', '2026-01-09 14:14:55.990016+00', '{}', '2025-12-18 21:43:18.742174+00', '2026-01-08 21:53:34.034545+00');


-- ============================================================
-- 4. PWA_CONVERSATION_MESSAGES - Mensagens das Conversas
-- ============================================================

DROP TABLE IF EXISTS pwa_conversation_messages CASCADE;

CREATE TABLE public.pwa_conversation_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES pwa_conversation_sessions(id) ON DELETE CASCADE,
    conversation_id UUID DEFAULT gen_random_uuid(),
    device_id TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    audio_url TEXT,
    audio_duration NUMERIC,
    transcription TEXT,
    taxonomy_tags TEXT[] DEFAULT '{}'::text[],
    key_topics JSONB DEFAULT '{"people": [], "countries": [], "organizations": []}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pwa_messages_session_id ON pwa_conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_pwa_messages_timestamp ON pwa_conversation_messages("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_pwa_messages_role ON pwa_conversation_messages(role);
CREATE INDEX IF NOT EXISTS idx_pwa_messages_conversation_id ON pwa_conversation_messages(conversation_id);

-- RLS Policy
ALTER TABLE pwa_conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pwa_conversation_messages_public_access" ON pwa_conversation_messages FOR ALL USING (true);

-- INSERT DATA (119 rows - exemplo das mensagens mais recentes)
-- Nota: Execute a query abaixo no Supabase de origem para exportar todas:
-- COPY (SELECT * FROM pwa_conversation_messages ORDER BY timestamp) TO '/tmp/pwa_messages.csv' WITH CSV HEADER;

INSERT INTO pwa_conversation_messages (id, session_id, conversation_id, device_id, role, content, audio_url, audio_duration, transcription, taxonomy_tags, key_topics, metadata, "timestamp", created_at) VALUES
('6d3c4f6d-b264-4142-bcd5-02bd46bd2680', '0c142e43-9bbd-4aee-b429-ec1416e4d518', 'acb99cc7-163b-4614-a54b-95322c4dad26', NULL, 'assistant', 'Olhei as nossas interações, e confirmo que **você não me perguntou nada a respeito de Nicolás Maduro até este momento.** Sua última pergunta foi se eu tinha o histórico da nossa conversa e se poderia recordá-lo.

Meu objetivo é prover análises econômicas consistentes. Se houver algum tópico relacionado ao presidente venezuelano que você deseja explorar sob uma ótica econômica e seu impacto para o Brasil, como fluxo comercial, questões de fronteira ou política externa e investimentos, por exemplo, por favor, me informe.', NULL, NULL, NULL, '{}', '{"people": [], "countries": [], "organizations": []}', '{}', '2026-01-08 18:19:29.681914+00', '2026-01-08 18:19:29.681914+00'),
('886be7ca-e355-41b7-82a3-d1d2f17b1e0f', '0c142e43-9bbd-4aee-b429-ec1416e4d518', '90a148ce-93f9-450c-bda1-514662d24113', NULL, 'user', 'Eu te perguntei alguma coisa a respeito do Maduro, do Nicolás Maduro? Por favor, dê uma olhadinha para verificar se eu já te perguntei.', NULL, NULL, NULL, '{}', '{"people": [], "countries": [], "organizations": []}', '{}', '2026-01-08 18:19:28.027333+00', '2026-01-08 18:19:28.027333+00'),
('85b5a40d-7eee-4ecd-b921-249383578e6a', '0c142e43-9bbd-4aee-b429-ec1416e4d518', 'a4aa586c-edc0-417a-a348-4a753fe6d909', NULL, 'assistant', 'Sim, eu tenho o histórico completo da nossa conversa.

Nosso diálogo começou com a sua menção a "sintomas, como vômitos". Eu, como consultor de negócios com foco em economia, prontamente questionei a relação entre essa informação e um contexto de negócios/economia, pedindo clareza sobre como isso se conectava a dados financeiros, mercado de trabalho, investimentos, etc.

Em seguida, você mencionou repetidamente "Legendas pela comunidade Amara.org". Eu, de forma consistente, apontei que essa informação, isoladamente, não possui um vínculo direto com a economia e solicitei que você contextualizasse como isso se encaixava em uma discussão econômica.

Até o momento, **a conversa não possui um projeto de negócios claro ou uma ideia a ser avaliada**. Meu papel é ser seu "Advogado do Diabo" para fortalecer uma ideia. Para isso, precisamos de uma ideia concreta de negócio.

Qual é a ideia de negócio ou projeto que você gostaria que eu questionasse e desafiasse?', NULL, NULL, NULL, '{}', '{"people": [], "countries": [], "organizations": []}', '{}', '2026-01-08 18:11:57.810781+00', '2026-01-08 18:11:57.810781+00'),
('cbb0a5ed-e146-434c-a33c-0a7bbe5badc1', '0c142e43-9bbd-4aee-b429-ec1416e4d518', '7a4bd5a7-e0c3-4963-af1c-d96bbaf1f7f9', NULL, 'user', 'Você tem o histórico do que nós estávamos falando? Pode recordar, por gentileza?', NULL, NULL, NULL, '{}', '{"people": [], "countries": [], "organizations": []}', '{}', '2026-01-08 18:11:54.92394+00', '2026-01-08 18:11:54.92394+00');

-- NOTA: Para exportar TODAS as mensagens, use:
-- SELECT 'INSERT INTO pwa_conversation_messages VALUES (' || 
--   quote_literal(id) || ', ' || quote_literal(session_id) || ', ' || 
--   COALESCE(quote_literal(conversation_id), 'NULL') || ', ' ||
--   COALESCE(quote_literal(device_id), 'NULL') || ', ' ||
--   quote_literal(role) || ', ' || quote_literal(content) || ', ' ||
--   COALESCE(quote_literal(audio_url), 'NULL') || ', ' ||
--   COALESCE(audio_duration::text, 'NULL') || ', ' ||
--   COALESCE(quote_literal(transcription), 'NULL') || ', ' ||
--   quote_literal(taxonomy_tags::text) || ', ' ||
--   quote_literal(key_topics::text) || ', ' ||
--   quote_literal(metadata::text) || ', ' ||
--   quote_literal(timestamp::text) || ', ' ||
--   quote_literal(created_at::text) || ');'
-- FROM pwa_conversation_messages;


-- ============================================================
-- 5. PWA_CONV_SUMMARIES - Resumos das Conversas
-- ============================================================

DROP TABLE IF EXISTS pwa_conv_summaries CASCADE;

CREATE TABLE public.pwa_conv_summaries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES pwa_conversation_sessions(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    summary_audio_url TEXT,
    taxonomy_tags TEXT[] DEFAULT '{}'::text[],
    key_topics JSONB DEFAULT '{"people": [], "countries": [], "organizations": []}'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pwa_summaries_session_id ON pwa_conv_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_pwa_summaries_generated_at ON pwa_conv_summaries(generated_at DESC);

-- RLS Policy
ALTER TABLE pwa_conv_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pwa_conv_summaries_public_access" ON pwa_conv_summaries FOR ALL USING (true);

-- INSERT DATA (1 row)
INSERT INTO pwa_conv_summaries (id, session_id, summary_text, summary_audio_url, taxonomy_tags, key_topics, generated_at) VALUES
('e47c881e-caf7-4e81-9ef7-85bc96b23aba', '0c142e43-9bbd-4aee-b429-ec1416e4d518', 'O usuário questionou sobre a situação política e econômica no Brasil, destacando os impactos negativos para a população e as perspectivas para as eleições de 2027, que geram incertezas no mercado e influenciam decisões de investimento. A polarização política e debates sobre reformas fiscais são centrais.', NULL, '{}', '{"countries": [], "last_assistant_message": "As eleições de 2027 já começam a pautar o cenário político e econômico brasileiro, com expectativas que geram volatilidade nos mercados e impactam o planejamento de investimentos.", "last_user_message": "Tem alguma perspectiva das eleições do próximo ano?", "organizations": [], "people": []}', '2026-01-08 13:08:41.076+00');


-- ============================================================
-- 6. TRIGGER para updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_pwa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pwa_config_updated_at
    BEFORE UPDATE ON pwa_config
    FOR EACH ROW
    EXECUTE FUNCTION update_pwa_updated_at();

CREATE TRIGGER pwa_user_context_updated_at
    BEFORE UPDATE ON pwa_user_context
    FOR EACH ROW
    EXECUTE FUNCTION update_pwa_updated_at();

CREATE TRIGGER pwa_conversation_sessions_updated_at
    BEFORE UPDATE ON pwa_conversation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_pwa_updated_at();


-- ============================================================
-- 7. GRANTS (para acesso via API)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON pwa_config TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pwa_user_context TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pwa_conversation_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pwa_conversation_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pwa_conv_summaries TO anon, authenticated;


-- ============================================================
-- INSTRUÇÕES DE USO
-- ============================================================
-- 
-- 1. Crie o novo projeto Supabase
-- 2. Acesse SQL Editor no dashboard
-- 3. Execute este script completo
-- 4. Para dados adicionais, use pg_dump ou COPY:
--
--    pg_dump -h db.XXXXX.supabase.co -U postgres -d postgres \
--      -t pwa_config -t pwa_user_context -t pwa_conversation_sessions \
--      -t pwa_conversation_messages -t pwa_conv_summaries \
--      --data-only -f pwa_data.sql
--
-- ============================================================
