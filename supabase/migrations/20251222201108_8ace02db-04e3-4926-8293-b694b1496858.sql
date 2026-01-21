-- ============================================
-- FASE 8: MAIÊUTICA COMPLETA
-- Tabela maieutic_metrics, view, índices, RLS
-- Atualização get_orchestrated_context
-- ============================================

-- 1. Tabela de métricas maiêuticas
CREATE TABLE IF NOT EXISTS public.maieutic_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  message_id UUID,
  cognitive_mode TEXT NOT NULL DEFAULT 'normal',
  detected_categories TEXT[] DEFAULT '{}',
  
  -- Métricas de interação
  user_asked_clarification BOOLEAN DEFAULT false,
  user_confirmed_understanding BOOLEAN DEFAULT false,
  conversation_continued BOOLEAN DEFAULT false,
  
  -- Métricas de resposta
  response_length INTEGER,
  pillbox_count INTEGER DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  
  -- Feedback implícito
  time_to_next_message INTEGER,
  next_message_type TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_maieutic_metrics_session ON maieutic_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_maieutic_metrics_mode ON maieutic_metrics(cognitive_mode);
CREATE INDEX IF NOT EXISTS idx_maieutic_metrics_date ON maieutic_metrics(created_at);

-- 3. RLS
ALTER TABLE maieutic_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage maieutic_metrics"
ON maieutic_metrics FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Public can read maieutic_metrics"
ON maieutic_metrics FOR SELECT USING (true);

CREATE POLICY "System can insert maieutic_metrics"
ON maieutic_metrics FOR INSERT WITH CHECK (true);

-- 4. View para dashboard de eficácia
CREATE OR REPLACE VIEW maieutic_effectiveness AS
SELECT 
  DATE_TRUNC('day', created_at) AS date,
  cognitive_mode,
  COUNT(*) AS total_interactions,
  SUM(CASE WHEN user_confirmed_understanding THEN 1 ELSE 0 END) AS confirmed_understanding,
  SUM(CASE WHEN user_asked_clarification THEN 1 ELSE 0 END) AS asked_clarification,
  AVG(pillbox_count)::NUMERIC(10,2) AS avg_pillbox_count,
  AVG(questions_asked)::NUMERIC(10,2) AS avg_questions_asked,
  AVG(time_to_next_message)::INTEGER AS avg_response_time
FROM maieutic_metrics
GROUP BY DATE_TRUNC('day', created_at), cognitive_mode
ORDER BY date DESC, cognitive_mode;

-- 5. Atualizar função get_orchestrated_context para integrar maieutic_training_categories
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
  v_maieutic_antiprompt TEXT := '';
  v_result JSONB;
  v_detected RECORD;
  v_category RECORD;
  v_detected_categories TEXT[] := ARRAY[]::TEXT[];
BEGIN
  v_normalized_query := LOWER(TRIM(p_query));
  
  -- ========== 1. DETECTAR CONTEXTO (economia, saúde, etc) ==========
  IF p_override_slug IS NOT NULL THEN
    SELECT * INTO v_context
    FROM context_profiles
    WHERE code = p_override_slug AND is_active = true
    LIMIT 1;
  END IF;
  
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
  
  IF v_context.id IS NULL THEN
    SELECT * INTO v_context
    FROM context_profiles
    WHERE is_default = true AND is_active = true
    LIMIT 1;
  END IF;
  
  -- ========== 2. DETECTAR CATEGORIAS MAIÊUTICAS ==========
  
  -- 2.1 Matemática
  IF v_normalized_query ~ '(\d+\s*[\+\-\*\/]\s*\d+|calcul|compar|gráfico|grafico|estatística|estatistica|porcentagem|média|media|soma|fórmula|formula|equação|equacao|ranking|tabela.*dado|dado.*tabela)' THEN
    v_detected_categories := array_append(v_detected_categories, 'math');
  END IF;
  
  -- 2.2 Regional
  IF v_normalized_query ~ '(oxe|oxente|bah|tchê|tche|mano|véi|vei|carai|caraca|arretado|massa|guri|guria|égua|egua|firmeza|suave|da hora)' THEN
    v_detected_categories := array_append(v_detected_categories, 'regional');
  END IF;
  
  -- 2.3 Nível de superficialidade (mutuamente exclusivos)
  IF v_normalized_query ~ '^(o que é|o que e|me fala sobre|como funciona|explica |qual é o|qual e o)\s' OR LENGTH(v_normalized_query) < 25 THEN
    v_detected_categories := array_append(v_detected_categories, 'high_superficial');
  ELSIF v_normalized_query ~ '(como (eu )?(posso|devo|consigo)|qual (é|e)? ?(a )?(melhor|diferença|diferenca)|por que|por quê|quando (devo|usar|posso))' THEN
    v_detected_categories := array_append(v_detected_categories, 'medium_superficial');
  ELSIF v_normalized_query ~ '(\?$|especificamente|exatamente|passo a passo|código|codigo|configure|instale|implemente|detalhe)' OR LENGTH(v_normalized_query) > 100 THEN
    v_detected_categories := array_append(v_detected_categories, 'deterministic');
  END IF;
  
  -- 2.4 Detectar modo cognitivo
  IF v_normalized_query ~ '(não entendi|nao entendi|não compreendi|nao compreendi|confuso|confusa|pode explicar|muito difícil|muito dificil|me explica|explica melhor|hã\?|hein\?|sou leigo|me perdi|o que significa|o que é isso|como assim|não sei nada|nao sei nada)' THEN
    v_cognitive_mode := 'maieutic';
  ELSIF LENGTH(v_normalized_query) < 25 AND v_normalized_query !~ '\?' THEN
    v_cognitive_mode := 'simplified';
  END IF;
  
  -- ========== 3. BUSCAR DIRETRIZES DAS CATEGORIAS DETECTADAS ==========
  FOR v_category IN (
    SELECT 
      category_key,
      category_name,
      positive_directives,
      antiprompt,
      behavioral_instructions
    FROM maieutic_training_categories
    WHERE category_key = ANY(v_detected_categories)
      AND is_active = true
    ORDER BY display_order
  )
  LOOP
    -- Acumular diretrizes positivas
    IF v_category.positive_directives IS NOT NULL AND v_category.positive_directives != '' THEN
      v_maieutic_prompt := v_maieutic_prompt || E'\n\n### ' || v_category.category_name || E':\n' || v_category.positive_directives;
    END IF;
    
    -- Acumular antiprompts
    IF v_category.antiprompt IS NOT NULL AND v_category.antiprompt != '' THEN
      v_maieutic_antiprompt := v_maieutic_antiprompt || E'\n\n### ' || v_category.category_name || E' - PROIBIDO:\n' || v_category.antiprompt;
    END IF;
    
    -- Acumular instruções comportamentais
    IF v_category.behavioral_instructions IS NOT NULL AND v_category.behavioral_instructions != '' THEN
      v_maieutic_prompt := v_maieutic_prompt || E'\n' || v_category.behavioral_instructions;
    END IF;
  END LOOP;
  
  -- ========== 4. INSTRUÇÕES DO MODO COGNITIVO ==========
  IF v_cognitive_mode = 'maieutic' THEN
    v_maieutic_prompt := v_maieutic_prompt || E'\n\n### 🧠 MODO MAIÊUTICO ATIVADO:
O usuário demonstra dificuldade de compreensão. Aplique OBRIGATORIAMENTE:
1. Divida a explicação em "pílulas" de 2-3 frases no máximo
2. Use analogias do dia-a-dia brasileiro (mercado, futebol, família)
3. Evite COMPLETAMENTE jargões técnicos - se precisar usar, explique antes
4. Após cada conceito importante, pergunte: "Isso ficou claro?" ou variações
5. Use exemplos práticos e concretos que o usuário possa visualizar
6. Se possível, use metáforas visuais e comparações simples';

    v_maieutic_antiprompt := v_maieutic_antiprompt || E'\n\n### 🧠 MODO MAIÊUTICO - ESTRITAMENTE PROIBIDO:
- NÃO use termos técnicos sem explicar antes em linguagem simples
- NÃO dê respostas longas de uma vez só - quebre em partes
- NÃO seja condescendente ou paternalista - trate com respeito
- NÃO pule etapas na explicação - vá do básico ao complexo
- NÃO assuma que o usuário sabe algo - explique tudo
- NÃO use siglas sem explicar o significado';

  ELSIF v_cognitive_mode = 'simplified' THEN
    v_maieutic_prompt := v_maieutic_prompt || E'\n\n### 📝 MODO SIMPLIFICADO:
Pergunta curta detectada. Responda de forma:
1. Direta e objetiva - vá direto ao ponto
2. Máximo 3-4 frases iniciais
3. Ofereça aprofundar apenas se relevante: "Quer que eu explique mais?"';
  END IF;
  
  -- ========== 5. MONTAR RESULTADO FINAL ==========
  v_result := jsonb_build_object(
    'contextCode', COALESCE(v_context.code, 'geral'),
    'contextName', COALESCE(v_context.name, 'Contexto Geral'),
    'promptTemplate', COALESCE(v_context.prompt_template, ''),
    'promptAdditions', COALESCE(v_context.prompt_additions, ''),
    'antiprompt', COALESCE(v_context.antiprompt, '') || v_maieutic_antiprompt,
    'maieuticPrompt', COALESCE(v_maieutic_prompt, ''),
    'taxonomyCodes', COALESCE(v_context.taxonomy_codes, ARRAY[]::TEXT[]),
    'matchThreshold', COALESCE(v_context.match_threshold, 0.15),
    'matchCount', COALESCE(v_context.match_count, 5),
    'tone', COALESCE(v_context.tone, 'formal'),
    'cognitiveMode', v_cognitive_mode,
    'detectedCategories', to_jsonb(v_detected_categories),
    'confidence', COALESCE(v_detected.confidence, 0.5),
    'wasOverridden', p_override_slug IS NOT NULL
  );
  
  RETURN v_result;
END;
$$;