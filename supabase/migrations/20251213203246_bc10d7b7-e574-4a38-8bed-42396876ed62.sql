-- 1. Remove 3 health APIs that return no data
DELETE FROM economic_indicators 
WHERE code IN (
  'MORTALIDADE_INFANTIL',
  'ESPERANCA_VIDA',
  'TAXA_FECUNDIDADE',
  'MORTALIDADE_INFANTIL_UF',
  'ESPERANCA_VIDA_UF',
  'FECUNDIDADE_UF'
);

DELETE FROM system_api_registry 
WHERE name IN (
  'Taxa de Mortalidade Infantil',
  'Esperança de Vida ao Nascer', 
  'Taxa de Fecundidade Total',
  'IBGE Mortalidade Infantil por UF',
  'IBGE Esperança de Vida por UF',
  'IBGE Fecundidade por UF'
);

-- 2. Fix Mat. Construção URL: v/7169 → v/7170 and c11046/56733 → c11046/56736
UPDATE system_api_registry
SET 
  base_url = 'https://apisidra.ibge.gov.br/values/t/8881/n3/all/v/7170/p/all/c11046/56736',
  source_data_status = 'pending_retest',
  source_data_message = 'URL corrigida - aguardando reteste'
WHERE name LIKE '%Mat. Construção%' AND provider = 'IBGE';

-- 3. Reset all PMC regional APIs to pending_retest
UPDATE system_api_registry
SET 
  source_data_status = 'pending_retest',
  source_data_message = 'Aguardando reteste após correção de URLs'
WHERE target_table = 'indicator_regional_values'
  AND name LIKE 'IBGE PMC%'
  AND source_data_status = 'unavailable';