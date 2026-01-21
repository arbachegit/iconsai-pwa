-- Adicionar coluna para regras de pronúncia customizadas por agente
ALTER TABLE chat_agents 
ADD COLUMN IF NOT EXISTS pronunciation_rules JSONB DEFAULT '{}';

-- Comentário na coluna
COMMENT ON COLUMN chat_agents.pronunciation_rules IS 
'Regras de pronúncia customizadas para TTS (termo → pronúncia fonética)';

-- Popular pronúncias iniciais para o agente de economia (se existir)
UPDATE chat_agents 
SET pronunciation_rules = '{
  "BCB": "Banco Central do Brasil",
  "COPOM": "Côpom",
  "IBGE": "í-bê-gê-é",
  "IPEA": "í-pê-é-á",
  "IPCA": "í-pê-cê-á",
  "PIB": "pib",
  "Selic": "Sélic",
  "SELIC": "Sélic",
  "CDI": "cê-dê-í",
  "PMC": "pê-ême-cê",
  "PTAX": "pê-táx",
  "GINI": "jíni",
  "FMI": "éfe-ême-í"
}'::jsonb
WHERE slug = 'economia' AND (pronunciation_rules IS NULL OR pronunciation_rules = '{}');