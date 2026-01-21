-- Deletar indicadores órfãos sem API e sem dados (nacional ou regional)
DELETE FROM economic_indicators 
WHERE api_id IS NULL 
AND id NOT IN (
  SELECT DISTINCT indicator_id FROM indicator_values
  UNION
  SELECT DISTINCT indicator_id FROM indicator_regional_values
);

-- Isso vai deletar: ICC, PAC_HIPERMERCADOS_UF, PAC_ALIMENTOS_UF, PAC_TECIDOS_UF, PAC_VEICULOS_PECAS_UF, TMI