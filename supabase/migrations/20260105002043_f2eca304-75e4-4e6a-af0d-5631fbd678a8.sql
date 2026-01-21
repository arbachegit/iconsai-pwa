-- Adicionar controles de voz ElevenLabs na pwa_config
-- Estes valores serão carregados dinamicamente pela edge function

-- 1. Stability (0.0-1.0) - Maior = mais consistente
INSERT INTO pwa_config (config_key, config_value, config_type, description)
VALUES (
  'voice_stability',
  '0.50',
  'number',
  'Estabilidade da voz ElevenLabs (0.0-1.0). Maior = mais consistente'
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- 2. Similarity Boost (0.0-1.0) - Fidelidade à voz original
INSERT INTO pwa_config (config_key, config_value, config_type, description)
VALUES (
  'voice_similarity',
  '1.00',
  'number',
  'Fidelidade à voz original ElevenLabs (0.0-1.0). Maior = mais fiel'
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- 3. Style (0.0-1.0) - Para voz natural, usar 0
INSERT INTO pwa_config (config_key, config_value, config_type, description)
VALUES (
  'voice_style',
  '0.00',
  'number',
  'Exagero de estilo ElevenLabs (0.0-1.0). Para voz natural, use 0'
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- 4. Speed (0.5-2.0) - Velocidade da fala
INSERT INTO pwa_config (config_key, config_value, config_type, description)
VALUES (
  'voice_speed',
  '1.15',
  'number',
  'Velocidade da fala (0.5-2.0). 1.0 = normal'
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- 5. Speaker Boost (boolean) - Melhor clareza
INSERT INTO pwa_config (config_key, config_value, config_type, description)
VALUES (
  'voice_speaker_boost',
  'true',
  'boolean',
  'Amplificação do falante ElevenLabs para melhor clareza'
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();