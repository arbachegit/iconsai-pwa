-- Adicionar coluna phonetic_map na tabela chat_config
ALTER TABLE chat_config 
ADD COLUMN phonetic_map JSONB DEFAULT '{}'::jsonb;

-- Popular com os dados iniciais para Study
UPDATE chat_config 
SET phonetic_map = '{
  "RAG": "érre-á-jê",
  "LLM": "éle-éle-ême",
  "SLM": "ésse-éle-ême",
  "GPT": "jê-pê-tê",
  "AI": "á-i",
  "IA": "í-á",
  "NLP": "éne-éle-pê",
  "ML": "éme-éle",
  "DL": "dê-éle",
  "API": "á-pê-í",
  "SDK": "ésse-dê-cá",
  "LLMs": "éle-éle-êmes",
  "SLMs": "ésse-éle-êmes",
  "APIs": "á-pê-ís",
  "chunks": "tchânks",
  "chunk": "tchânk",
  "embedding": "embéding",
  "embeddings": "embédings",
  "token": "tôken",
  "tokens": "tôkens",
  "prompt": "prômpt",
  "prompts": "prômpits",
  "fine-tuning": "fáin túning",
  "fine tuning": "fáin túning",
  "dataset": "déita sét",
  "datasets": "déita séts",
  "pipeline": "páip láin",
  "pipelines": "páip láins",
  "framework": "fréim uórk",
  "frameworks": "fréim uórks",
  "benchmark": "bêntch márk",
  "benchmarks": "bêntch márks",
  "chatbot": "tchét bót",
  "chatbots": "tchét bóts",
  "multimodal": "múlti módal",
  "transformer": "trans fórmer",
  "transformers": "trans fórmers",
  "vector": "vétor",
  "vectors": "vétores",
  "retrieval": "retriéval",
  "augmented": "ógmentéd",
  "generation": "djenereíchon",
  "OpenAI": "Ópen á-i",
  "ChatGPT": "Tchét jê-pê-tê",
  "Gemini": "Jêmini",
  "Claude": "Clód",
  "Llama": "Lhâma",
  "BERT": "Bért",
  "GPT-4": "jê-pê-tê quatro",
  "GPT-5": "jê-pê-tê cinco",
  "KnowRISK": "Nôu Rísk",
  "KnowYOU": "Nôu Iú",
  "ACC": "á-cê-cê"
}'::jsonb
WHERE chat_type = 'study';

-- Popular com dados iniciais vazios para Health (a ser preenchido pelo admin)
UPDATE chat_config 
SET phonetic_map = '{}'::jsonb
WHERE chat_type = 'health';