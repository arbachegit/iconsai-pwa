-- V7.1 FASE 1: Correção de Datas Invertidas e NULLs

-- 1. Corrigir IPCA (datas invertidas: estava 2025 → 2012, deveria ser 2012 → 2025)
UPDATE system_api_registry 
SET 
  fetch_start_date = '2012-01-01',
  fetch_end_date = '2025-12-11'
WHERE name = 'IPCA';

-- 2. Preencher fetch_end_date NULL em todas as APIs ativas
UPDATE system_api_registry 
SET fetch_end_date = '2025-12-11'
WHERE fetch_end_date IS NULL 
  AND status = 'active';

-- 3. Padronizar fetch_start_date para APIs que não têm data configurada
UPDATE system_api_registry 
SET fetch_start_date = '2015-01-01'
WHERE fetch_start_date IS NULL 
  AND status = 'active'
  AND provider IN ('BCB', 'IBGE');

-- 4. Log de auditoria para verificação
-- SELECT name, provider, fetch_start_date, fetch_end_date FROM system_api_registry WHERE status = 'active';