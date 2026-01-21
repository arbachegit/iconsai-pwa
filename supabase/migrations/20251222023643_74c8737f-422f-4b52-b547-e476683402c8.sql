-- ============================================
-- FASE 3.5: ORQUESTRADOR ÚNICO
-- ============================================

-- 1. Tabela context_profiles: Contextos dinâmicos para detecção automática
CREATE TABLE IF NOT EXISTS public.context_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL DEFAULT '',
  prompt_additions TEXT,
  antiprompt TEXT,
  taxonomy_codes TEXT[] DEFAULT '{}',
  detection_keywords TEXT[] DEFAULT '{}',
  detection_priority INTEGER DEFAULT 100,
  tone TEXT DEFAULT 'formal',
  match_threshold FLOAT DEFAULT 0.15,
  match_count INTEGER DEFAULT 5,
  maieutic_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela context_detection_rules: Regras avançadas de detecção
CREATE TABLE IF NOT EXISTS public.context_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID REFERENCES public.context_profiles(id) ON DELETE CASCADE,
  rule_type TEXT CHECK (rule_type IN ('keyword', 'phrase', 'regex', 'negation')),
  rule_value TEXT NOT NULL,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_context_profiles_active ON public.context_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_context_profiles_code ON public.context_profiles(code);
CREATE INDEX IF NOT EXISTS idx_context_detection_rules_context ON public.context_detection_rules(context_id);

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_context_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_context_profiles_updated_at ON public.context_profiles;
CREATE TRIGGER update_context_profiles_updated_at
  BEFORE UPDATE ON public.context_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_context_profiles_updated_at();

-- 5. Função detect_context: Detecta contexto baseado na query
CREATE OR REPLACE FUNCTION public.detect_context(p_query TEXT)
RETURNS TABLE(
  context_code TEXT,
  context_name TEXT,
  score FLOAT,
  confidence FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_normalized_query TEXT;
  v_results RECORD;
  v_max_score FLOAT := 0;
  v_total_score FLOAT := 0;
BEGIN
  v_normalized_query := LOWER(TRIM(p_query));
  
  -- Calcular scores para cada contexto ativo
  FOR v_results IN (
    WITH context_scores AS (
      SELECT 
        cp.code,
        cp.name,
        cp.detection_priority,
        -- Score base por keywords diretas
        COALESCE(
          (SELECT SUM(1.5) 
           FROM unnest(cp.detection_keywords) AS kw 
           WHERE v_normalized_query LIKE '%' || LOWER(kw) || '%'),
          0
        ) AS keyword_score,
        -- Score por regras de detecção
        COALESCE(
          (SELECT SUM(cdr.weight)
           FROM context_detection_rules cdr
           WHERE cdr.context_id = cp.id
             AND cdr.rule_type IN ('keyword', 'phrase')
             AND v_normalized_query LIKE '%' || LOWER(cdr.rule_value) || '%'),
          0
        ) AS rule_score,
        -- Score negativo por regras de negação
        COALESCE(
          (SELECT SUM(-cdr.weight * 2)
           FROM context_detection_rules cdr
           WHERE cdr.context_id = cp.id
             AND cdr.rule_type = 'negation'
             AND v_normalized_query LIKE '%' || LOWER(cdr.rule_value) || '%'),
          0
        ) AS negation_score,
        -- Bonus por prioridade (normalizado)
        (cp.detection_priority::FLOAT / 100.0) AS priority_bonus,
        -- Score default
        CASE WHEN cp.is_default THEN 0.5 ELSE 0 END AS default_bonus
      FROM context_profiles cp
      WHERE cp.is_active = true
    )
    SELECT 
      cs.code,
      cs.name,
      GREATEST(0, cs.keyword_score + cs.rule_score + cs.negation_score + cs.priority_bonus + cs.default_bonus) AS total_score
    FROM context_scores cs
    ORDER BY total_score DESC
  )
  LOOP
    context_code := v_results.code;
    context_name := v_results.name;
    score := v_results.total_score;
    v_total_score := v_total_score + v_results.total_score;
    
    IF v_results.total_score > v_max_score THEN
      v_max_score := v_results.total_score;
    END IF;
    
    -- Calcular confidence (0-1)
    IF v_max_score > 0 AND v_total_score > 0 THEN
      confidence := ROUND((score / (v_max_score + 1))::NUMERIC, 2);
    ELSE
      confidence := 0.5;
    END IF;
    
    RETURN NEXT;
  END LOOP;
  
  -- Se nenhum contexto encontrado, retornar default
  IF NOT FOUND THEN
    SELECT cp.code, cp.name INTO context_code, context_name
    FROM context_profiles cp
    WHERE cp.is_default = true AND cp.is_active = true
    LIMIT 1;
    
    IF context_code IS NULL THEN
      context_code := 'geral';
      context_name := 'Contexto Geral';
    END IF;
    
    score := 0.5;
    confidence := 0.5;
    RETURN NEXT;
  END IF;
END;
$$;

-- 6. Função get_orchestrated_context: Retorna contexto completo com maiêutica
CREATE OR REPLACE FUNCTION public.get_orchestrated_context(
  p_query TEXT,
  p_override_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_context RECORD;
  v_cognitive_mode TEXT := 'normal';
  v_normalized_query TEXT;
  v_maieutic_prompt TEXT := '';
  v_result JSONB;
  v_detected RECORD;
BEGIN
  v_normalized_query := LOWER(TRIM(p_query));
  
  -- 1. Se há override, buscar contexto específico
  IF p_override_slug IS NOT NULL THEN
    SELECT * INTO v_context
    FROM context_profiles
    WHERE code = p_override_slug AND is_active = true
    LIMIT 1;
  END IF;
  
  -- 2. Se não encontrou por override, detectar automaticamente
  IF v_context.id IS NULL THEN
    SELECT * INTO v_detected
    FROM detect_context(p_query)
    ORDER BY score DESC
    LIMIT 1;
    
    IF v_detected.context_code IS NOT NULL THEN
      SELECT * INTO v_context
      FROM context_profiles
      WHERE code = v_detected.context_code
      LIMIT 1;
    END IF;
  END IF;
  
  -- 3. Fallback para default
  IF v_context.id IS NULL THEN
    SELECT * INTO v_context
    FROM context_profiles
    WHERE is_default = true AND is_active = true
    LIMIT 1;
  END IF;
  
  -- 4. Detectar modo cognitivo (maiêutica)
  IF v_context.maieutic_enabled THEN
    -- Modo maiêutico: dificuldade de compreensão
    IF v_normalized_query ~ '(não entendi|não compreendi|confuso|pode explicar|muito difícil|não consegui entender|me explica|explica melhor|o que significa|o que é)' THEN
      v_cognitive_mode := 'maieutic';
      v_maieutic_prompt := E'\n\n### 🧠 MODO MAIÊUTICO ATIVADO:\nO usuário demonstra dificuldade de compreensão. Aplique:\n1. Divida a explicação em pílulas de 2-3 frases\n2. Use analogias do dia-a-dia brasileiro\n3. Evite jargões técnicos\n4. Ao final, pergunte: "Isso ficou mais claro?"\n5. Se possível, use exemplos práticos';
    -- Modo simplificado: perguntas muito curtas
    ELSIF LENGTH(v_normalized_query) < 30 AND ARRAY_LENGTH(string_to_array(v_normalized_query, ' '), 1) < 6 THEN
      v_cognitive_mode := 'simplified';
      v_maieutic_prompt := E'\n\n### 📝 MODO SIMPLIFICADO:\nPergunta curta detectada. Responda de forma:\n1. Direta e objetiva\n2. Máximo 3-4 frases iniciais\n3. Ofereça aprofundar se o usuário quiser';
    END IF;
  END IF;
  
  -- 5. Montar resultado
  v_result := jsonb_build_object(
    'contextCode', COALESCE(v_context.code, 'geral'),
    'contextName', COALESCE(v_context.name, 'Contexto Geral'),
    'promptTemplate', COALESCE(v_context.prompt_template, ''),
    'promptAdditions', COALESCE(v_context.prompt_additions, ''),
    'antiprompt', COALESCE(v_context.antiprompt, ''),
    'maieuticPrompt', v_maieutic_prompt,
    'taxonomyCodes', COALESCE(v_context.taxonomy_codes, ARRAY[]::TEXT[]),
    'matchThreshold', COALESCE(v_context.match_threshold, 0.15),
    'matchCount', COALESCE(v_context.match_count, 5),
    'tone', COALESCE(v_context.tone, 'formal'),
    'cognitiveMode', v_cognitive_mode,
    'confidence', COALESCE(v_detected.confidence, 0.5),
    'wasOverridden', p_override_slug IS NOT NULL
  );
  
  RETURN v_result;
END;
$$;

-- 7. Migrar dados dos chat_agents existentes para context_profiles
INSERT INTO public.context_profiles (code, name, description, prompt_template, taxonomy_codes, detection_keywords, detection_priority, tone, match_threshold, match_count, maieutic_enabled, is_default)
SELECT 
  ca.slug AS code,
  ca.name,
  ca.description,
  COALESCE(ca.system_prompt, '') AS prompt_template,
  COALESCE(
    (SELECT ARRAY_AGG(gt.code) 
     FROM agent_tag_profiles atp 
     JOIN global_taxonomy gt ON gt.id = atp.taxonomy_id 
     WHERE atp.agent_id = ca.id AND atp.access_type = 'include'),
    '{}'::TEXT[]
  ) AS taxonomy_codes,
  CASE ca.slug
    WHEN 'economia' THEN ARRAY['inflação', 'pib', 'selic', 'dólar', 'varejo', 'pmc', 'ipca', 'economia', 'indicador', 'taxa', 'comércio', 'preço', 'mercado']
    WHEN 'health' THEN ARRAY['saúde', 'doença', 'sintoma', 'tratamento', 'médico', 'medicina', 'paciente', 'diagnóstico']
    WHEN 'ideias' THEN ARRAY['ideia', 'projeto', 'inovação', 'criativo', 'brainstorm', 'solução', 'proposta']
    WHEN 'study' THEN ARRAY['estudo', 'aprender', 'conhecimento', 'educação', 'material', 'curso']
    WHEN 'company' THEN ARRAY['empresa', 'negócio', 'gestão', 'estratégia', 'organização', 'corporativo']
    ELSE ARRAY[]::TEXT[]
  END AS detection_keywords,
  CASE ca.slug
    WHEN 'economia' THEN 100
    WHEN 'health' THEN 90
    WHEN 'ideias' THEN 80
    WHEN 'company' THEN 80
    WHEN 'study' THEN 70
    ELSE 50
  END AS detection_priority,
  COALESCE(ca.regional_tone, 'formal') AS tone,
  COALESCE(ca.match_threshold, 0.15) AS match_threshold,
  COALESCE(ca.match_count, 5) AS match_count,
  CASE WHEN ca.maieutic_level IS NOT NULL THEN true ELSE false END AS maieutic_enabled,
  CASE WHEN ca.slug = 'study' THEN true ELSE false END AS is_default
FROM chat_agents ca
WHERE ca.is_active = true
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  prompt_template = EXCLUDED.prompt_template,
  taxonomy_codes = EXCLUDED.taxonomy_codes,
  detection_keywords = EXCLUDED.detection_keywords,
  detection_priority = EXCLUDED.detection_priority,
  tone = EXCLUDED.tone,
  match_threshold = EXCLUDED.match_threshold,
  match_count = EXCLUDED.match_count,
  maieutic_enabled = EXCLUDED.maieutic_enabled,
  updated_at = NOW();

-- 8. Inserir regras de detecção para economia (exemplo)
INSERT INTO public.context_detection_rules (context_id, rule_type, rule_value, weight)
SELECT 
  cp.id,
  'keyword',
  kw,
  1.5
FROM context_profiles cp,
LATERAL unnest(ARRAY['taxa de juros', 'banco central', 'crescimento econômico', 'poder de compra', 'custo de vida']) AS kw
WHERE cp.code = 'economia'
ON CONFLICT DO NOTHING;

-- 9. Inserir regras de negação (quando NÃO deve ir para economia)
INSERT INTO public.context_detection_rules (context_id, rule_type, rule_value, weight)
SELECT 
  cp.id,
  'negation',
  kw,
  2.0
FROM context_profiles cp,
LATERAL unnest(ARRAY['receita médica', 'sintoma', 'código fonte', 'programação']) AS kw
WHERE cp.code = 'economia'
ON CONFLICT DO NOTHING;

-- 10. RLS Policies
ALTER TABLE public.context_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_detection_rules ENABLE ROW LEVEL SECURITY;

-- Leitura pública para as funções edge
CREATE POLICY "Allow public read on context_profiles"
ON public.context_profiles FOR SELECT
USING (true);

CREATE POLICY "Allow public read on context_detection_rules"
ON public.context_detection_rules FOR SELECT
USING (true);

-- Escrita apenas para admins autenticados
CREATE POLICY "Allow authenticated insert on context_profiles"
ON public.context_profiles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update on context_profiles"
ON public.context_profiles FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert on context_detection_rules"
ON public.context_detection_rules FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update on context_detection_rules"
ON public.context_detection_rules FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated delete on context_detection_rules"
ON public.context_detection_rules FOR DELETE
TO authenticated
USING (true);