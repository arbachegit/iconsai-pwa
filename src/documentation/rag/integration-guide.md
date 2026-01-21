# Documentação de Integração RAG com Chats

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Pipeline ETL](#pipeline-etl)
4. [Sistema de Busca Híbrida](#sistema-de-busca-híbrida)
5. [Integração com Chats](#integração-com-chats)
6. [Edge Functions](#edge-functions)
7. [Tags Hierárquicas](#tags-hierárquicas)
8. [Configurações e Escopo](#configurações-e-escopo)
9. [Analytics e Métricas](#analytics-e-métricas)
10. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O sistema RAG (Retrieval-Augmented Generation) integrado aos chats KnowYOU permite que os assistentes de IA forneçam respostas fundamentadas em documentos específicos, melhorando significativamente a precisão e relevância das respostas.

### Características Principais

- **Busca Híbrida**: Combina busca vetorial (embeddings) com fallback para busca por keywords
- **Tags Hierárquicas**: Sistema parent/child para categorização inteligente
- **Auto-categorização**: SLMs classificam documentos automaticamente em "study" ou "health"
- **Escopo Dinâmico**: Delimitações atualizadas automaticamente com base nas tags dos documentos
- **Métricas em Tempo Real**: Tracking completo de performance e qualidade

---

## Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────┐
│   Frontend      │
│  (PDF Upload)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           ETL Pipeline                   │
│  1. Extração (pdfjs-dist)               │
│  2. Validação Unicode                   │
│  3. Análise de Legibilidade (SLM)       │
│  4. Chunking (1500 palavras)            │
│  5. Embeddings (KY AI)                  │
│  6. Tags Hierárquicas (SLM)             │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│    PostgreSQL + pgvector                │
│  • document_chunks (VECTOR(1536))       │
│  • documents                            │
│  • document_tags                        │
│  • chat_config                          │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        Retrieval Engine                 │
│  1. Query Embedding                     │
│  2. Busca Vetorial (threshold 0.15)     │
│  3. Keyword Fallback (threshold 0.50)   │
│  4. Top-K Selection (5 chunks)          │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│          Generation Layer               │
│  • Contexto RAG                         │
│  • System Prompt + Scope                │
│  • SLM Response (KY AI)                 │
└─────────────────────────────────────────┘
```

---

## Pipeline ETL

### 1. Upload e Extração

**Frontend (`DocumentsTab.tsx`)**:
```typescript
// Extração usando pdfjs-dist (NUNCA no backend)
const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
let extractedText = "";

for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const textContent = await page.getTextContent();
  const pageText = textContent.items
    .map((item: any) => item.str)
    .join(" ");
  extractedText += pageText + "\n";
}
```

**Validação Inicial**:
- Mínimo 100 caracteres
- Sanitização Unicode (remove surrogates)
- Preview dos primeiros 500 caracteres

### 2. Processamento Backend

**Edge Function: `process-bulk-document`**

```typescript
// Validação de legibilidade com SLM
const legibilityPrompt = `
Analise o seguinte texto extraído de PDF e determine:
1. É legível? (sim/não)
2. Score de legibilidade (0-100)
3. Motivo se for ilegível

Texto: ${text.substring(0, 2000)}
`;

const legibilityResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [{ role: "user", content: legibilityPrompt }],
  }),
});
```

### 3. Chunking

**Estratégia: Word-Based Chunking**

```typescript
// Divide em chunks de 1500 palavras
const words = text.split(/\s+/);
const chunkSize = 1500;
const chunks = [];

for (let i = 0; i < words.length; i += chunkSize) {
  const chunkWords = words.slice(i, i + chunkSize);
  chunks.push({
    content: chunkWords.join(" "),
    chunk_index: Math.floor(i / chunkSize),
    word_count: chunkWords.length
  });
}
```

### 4. Embeddings

**KY AI Text Embeddings**:

```typescript
// Gerar embedding para cada chunk
const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "text-embedding-3-small",
    input: chunk.content,
  }),
});

const embedding = embeddingResponse.data[0].embedding; // 1536 dimensões
```

### 5. Auto-categorização

**SLM-based Classification**:

```typescript
const categorizationPrompt = `
Analise o documento e categorize como:
- HEALTH: conteúdo médico, hospitalar, saúde
- STUDY: conteúdo sobre KnowRISK, ACC, IA, tecnologia
- GENERAL: outros

Retorne apenas: HEALTH, STUDY ou GENERAL
`;

const categoryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  // ... configuração SLM
});
```

---

## Sistema de Busca Híbrida

### Busca Vetorial (Primária)

**Edge Function: `search-documents`**

```typescript
// Converter query em embedding
const queryEmbedding = await generateEmbedding(query);

// Busca por similaridade cosseno
const { data: vectorResults } = await supabase.rpc('search_documents', {
  query_embedding: queryEmbedding,
  target_chat_filter: targetChat,
  match_threshold: 0.15, // 15% similaridade mínima
  match_count: 5
});
```

**Função Database: `search_documents`**

```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  target_chat_filter text DEFAULT NULL,
  match_threshold double precision DEFAULT 0.15,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity double precision,
  metadata jsonb
)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id AS chunk_id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE d.status = 'completed'
    AND d.is_readable = true
    AND (target_chat_filter IS NULL OR d.target_chat = target_chat_filter)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Fallback: Busca por Keywords

**Quando usar**: Se busca vetorial retornar 0 resultados

```typescript
// Extrair keywords da query
const stopwords = ['o', 'a', 'de', 'para', 'com', 'em', 'que', 'um', 'uma'];
const keywords = query
  .toLowerCase()
  .split(/\s+/)
  .filter(word => word.length > 3 && !stopwords.includes(word));

// Busca usando ILIKE
const { data: keywordResults } = await supabase.rpc('search_documents_keywords', {
  keywords,
  target_chat_filter: targetChat,
  match_count: 5
});
```

**Função Database: `search_documents_keywords`**

```sql
CREATE OR REPLACE FUNCTION search_documents_keywords(
  keywords text[],
  target_chat_filter text DEFAULT NULL,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity double precision,
  metadata jsonb,
  matched_keyword text
)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id AS chunk_id,
    dc.document_id,
    dc.content,
    0.5::double precision AS similarity,
    dc.metadata,
    kw AS matched_keyword
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  CROSS JOIN LATERAL unnest(keywords) AS kw
  WHERE d.status = 'completed'
    AND d.is_readable = true
    AND (target_chat_filter IS NULL OR d.target_chat = target_chat_filter)
    AND dc.content ILIKE '%' || kw || '%'
  GROUP BY dc.id, dc.document_id, dc.content, dc.metadata, kw
  ORDER BY length(kw) DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Integração com Chats

### Arquitetura de Integração

```typescript
// Edge Function: chat-router
async function handleChatRequest(query: string, chatType: 'study' | 'health' | 'economia' | 'ideias') {
  // 1. Buscar contexto RAG
  const ragContext = await searchDocuments(query, chatType);
  
  // 2. Recuperar configuração do chat
  const { data: config } = await supabase
    .from('chat_config')
    .select('*')
    .eq('chat_type', chatType)
    .single();
  
  // 3. Construir system prompt
  const systemPrompt = buildSystemPrompt(config, ragContext);
  
  // 4. Chamar SLM
  const response = await callSLM(systemPrompt, query);
  
  // 5. Registrar analytics
  await logRAGAnalytics(query, ragContext, chatType);
  
  return response;
}
```

### System Prompt Construction

```typescript
function buildSystemPrompt(config, ragContext) {
  let prompt = config.system_prompt_base;
  
  // REGRA ABSOLUTA: RAG tem prioridade total
  if (ragContext.results.length > 0) {
    prompt += `\n\nREGRA ABSOLUTA - CONTEXTO RAG TEM PRIORIDADE TOTAL\n`;
    prompt += `\nCONTEXTO DOS DOCUMENTOS:\n`;
    
    ragContext.results.forEach((chunk, idx) => {
      prompt += `\n[Documento ${idx + 1}]:\n${chunk.content}\n`;
    });
    
    prompt += `\nUSE APENAS AS INFORMAÇÕES ACIMA para responder. `;
    prompt += `Se o contexto não contiver informação relevante, informe que não encontrou nos documentos disponíveis.\n`;
  } else {
    // Sem contexto RAG: aplicar delimitações de escopo
    prompt += `\n\nESCOPO PERMITIDO:\n`;
    prompt += config.scope_topics.join(', ');
    prompt += `\n\nMENSAGEM DE REJEIÇÃO:\n${config.rejection_message}\n`;
  }
  
  // Adicionar instrução de prioridade RAG
  if (config.rag_priority_instruction) {
    prompt += `\n${config.rag_priority_instruction}\n`;
  }
  
  return prompt;
}
```

### Chat Study (KnowRISK/ACC)

**Configuração**:
- `target_chat`: "study"
- **Documentos**: PDFs sobre KnowRISK, KnowYOU, ACC framework
- **Escopo**: IA, tecnologia, frameworks cognitivos
- **Rejection Message**: "Posso ajudar apenas com conteúdo sobre KnowRISK, KnowYOU e ACC"

### Chat Health (Hospital Moinhos)

**Configuração**:
- `target_chat`: "health"
- **Documentos**: Relatórios hospitalares, procedimentos médicos
- **Escopo**: Saúde, medicina, Hospital Moinhos de Vento
- **Rejection Message**: "Posso ajudar apenas com conteúdo de saúde e Hospital Moinhos"

---

## Edge Functions

### 1. `process-bulk-document`

**Responsabilidade**: Pipeline completo de processamento

```typescript
// Fluxo completo
serve(async (req) => {
  // 1. Receber texto extraído do frontend
  const { filename, text, targetChat } = await req.json();
  
  // 2. Validar legibilidade (SLM)
  const legibility = await analyzeLegibility(text);
  
  // 3. Auto-categorizar (SLM)
  const category = await categorizeDocument(text);
  
  // 4. Criar documento no banco
  const { data: doc } = await supabase.from('documents').insert({
    filename,
    original_text: text,
    target_chat: category,
    status: 'processing',
    is_readable: legibility.isReadable,
    readability_score: legibility.score
  }).select().single();
  
  // 5. Chunking
  const chunks = chunkText(text, 1500);
  
  // 6. Gerar embeddings para cada chunk
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);
    
    await supabase.from('document_chunks').insert({
      document_id: doc.id,
      content: chunk.content,
      chunk_index: chunk.index,
      word_count: chunk.wordCount,
      embedding: embedding
    });
  }
  
  // 7. Gerar tags hierárquicas (SLM)
  const tags = await generateTags(text);
  
  for (const tag of tags) {
    await supabase.from('document_tags').insert({
      document_id: doc.id,
      tag_name: tag.name,
      tag_type: tag.type, // 'parent' ou 'child'
      confidence: tag.confidence, // 0.0 - 1.0
      parent_tag_id: tag.parentId
    });
  }
  
  // 8. Gerar sumário (SLM)
  const summary = await generateSummary(text);
  
  // 9. Atualizar documento
  await supabase.from('documents').update({
    status: 'completed',
    ai_summary: summary,
    total_chunks: chunks.length,
    total_words: countWords(text)
  }).eq('id', doc.id);
  
  return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
});
```

### 2. `search-documents`

**Responsabilidade**: Busca híbrida com analytics

```typescript
serve(async (req) => {
  const { query, targetChat, matchThreshold, matchCount } = await req.json();
  const startTime = Date.now();
  
  // 1. Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Busca vetorial
  let results = await supabase.rpc('search_documents', {
    query_embedding: queryEmbedding,
    target_chat_filter: targetChat,
    match_threshold: matchThreshold || 0.15,
    match_count: matchCount || 5
  });
  
  let searchType = 'vector';
  
  // 3. Fallback para keywords se necessário
  if (results.data?.length === 0) {
    const keywords = extractKeywords(query);
    results = await supabase.rpc('search_documents_keywords', {
      keywords,
      target_chat_filter: targetChat,
      match_count: matchCount || 5
    });
    searchType = 'keyword';
  }
  
  const latency = Date.now() - startTime;
  
  // 4. Registrar analytics
  await supabase.from('rag_analytics').insert({
    query,
    target_chat: targetChat,
    search_type: searchType,
    results_count: results.data?.length || 0,
    top_similarity_score: results.data?.[0]?.similarity,
    latency_ms: latency,
    success_status: true,
    match_threshold: matchThreshold
  });
  
  return new Response(JSON.stringify({
    results: results.data,
    search_type: searchType,
    analytics: {
      latency_ms: latency,
      top_score: results.data?.[0]?.similarity
    }
  }), { headers: corsHeaders });
});
```

### 3. `suggest-document-tags`

**Responsabilidade**: Geração de tags hierárquicas

```typescript
serve(async (req) => {
  const { text } = await req.json();
  
  const prompt = `
Analise o seguinte texto e gere tags hierárquicas:

PARENT TAGS (3-5): Categorias amplas
CHILD TAGS (5-10 por parent): Tópicos específicos

Para cada tag, forneça:
- Nome da tag
- Tipo (parent/child)
- Confidence (0.0-1.0 como decimal)
- Parent ID (para child tags)

Texto: ${text.substring(0, 3000)}
`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      tools: [{
        type: "function",
        function: {
          name: "generate_tags",
          parameters: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string", enum: ["parent", "child"] },
                    confidence: { type: "number" },
                    parent_id: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "generate_tags" } }
    }),
  });
  
  // Parsear resposta e retornar tags
  const data = await response.json();
  const tags = parseTags(data);
  
  return new Response(JSON.stringify({ tags }), { headers: corsHeaders });
});
```

### 4. `generate-document-summary`

**Responsabilidade**: Sumário e avaliação de legibilidade

```typescript
serve(async (req) => {
  const { text } = await req.json();
  
  const prompt = `
Gere um sumário de 150-300 palavras do seguinte documento.
Avalie também a legibilidade em escala 0-100.

Documento: ${text.substring(0, 5000)}
`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }]
    }),
  });
  
  const data = await response.json();
  const summary = data.choices[0].message.content;
  
  return new Response(JSON.stringify({ summary }), { headers: corsHeaders });
});
```

---

## Tags Hierárquicas

### Estrutura

```
Parent Tag (confidence >= 0.70) ← Incluído no scope_topics
├── Child Tag 1 (confidence >= 0.60)
├── Child Tag 2 (confidence >= 0.70)
└── Child Tag 3 (confidence >= 0.50)
```

### Trigger de Atualização Automática

**Database Trigger: `on_tag_insert_update_config`**

```sql
CREATE OR REPLACE FUNCTION update_chat_config_on_tag_insert()
RETURNS TRIGGER AS $$
DECLARE
  doc_target_chat TEXT;
BEGIN
  -- Buscar target_chat do documento
  SELECT target_chat INTO doc_target_chat
  FROM documents WHERE id = NEW.document_id;
  
  IF doc_target_chat IS NOT NULL THEN
    -- Atualizar scope_topics automaticamente
    UPDATE chat_config SET
      scope_topics = (
        SELECT COALESCE(ARRAY_AGG(DISTINCT tag_name), '{}'::text[])
        FROM document_tags dt
        JOIN documents d ON dt.document_id = d.id
        WHERE d.target_chat = doc_target_chat 
          AND d.status = 'completed'
          AND dt.tag_type = 'parent'
          AND dt.confidence >= 0.7
      ),
      -- Atualizar dados completos das tags para UI
      document_tags_data = (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'tag_name', tag_name,
              'tag_type', tag_type,
              'avg_confidence', avg_conf,
              'count', tag_count
            ) ORDER BY tag_count DESC, avg_conf DESC
          ),
          '[]'::jsonb
        )
        FROM (
          SELECT 
            dt.tag_name,
            dt.tag_type,
            AVG(dt.confidence) as avg_conf,
            COUNT(*) as tag_count
          FROM document_tags dt
          JOIN documents d ON dt.document_id = d.id
          WHERE d.target_chat = doc_target_chat 
            AND d.status = 'completed'
          GROUP BY dt.tag_name, dt.tag_type
        ) tag_stats
      ),
      updated_at = NOW()
    WHERE chat_type = doc_target_chat;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_tag_insert_update_config
  AFTER INSERT OR UPDATE ON document_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_config_on_tag_insert();
```

### Uso no Admin Panel

**ChatScopeConfigTab Component**:

```typescript
// Visualizar tags parent incluídas no escopo
const highConfParents = config.document_tags_data
  .filter(t => t.tag_type === 'parent' && t.avg_confidence >= 0.7);

// Visualizar tags parent excluídas (baixa confiança)
const lowConfParents = config.document_tags_data
  .filter(t => t.tag_type === 'parent' && t.avg_confidence < 0.7);

// Visualizar child tags
const childTags = config.document_tags_data
  .filter(t => t.tag_type === 'child');
```

---

## Configurações e Escopo

### Tabela `chat_config`

**Campos Principais**:

```typescript
interface ChatConfig {
  chat_type: 'study' | 'health';
  match_threshold: number;        // 0.15 padrão
  match_count: number;            // 5 padrão
  scope_topics: string[];         // Auto-gerado das parent tags
  rejection_message: string;      // Mensagem quando fora do escopo
  system_prompt_base: string;     // Prompt base do SLM
  rag_priority_instruction: string; // Instrução de prioridade RAG
  total_documents: number;        // Calculado automaticamente
  total_chunks: number;           // Calculado automaticamente
  last_document_added: timestamp; // Última adição
  health_status: 'ok' | 'warning' | 'error';
  health_issues: any[];           // Problemas detectados
  document_tags_data: {           // Dados completos das tags
    tag_name: string;
    tag_type: 'parent' | 'child';
    avg_confidence: number;
    count: number;
  }[];
}
```

### Health Checks Automáticos

```typescript
async function calculateHealthIssues(config: ChatConfig) {
  const issues = [];
  
  // Check threshold
  if (config.match_threshold > 0.3) {
    issues.push({
      type: 'warning',
      message: `Threshold muito alto (${config.match_threshold}) pode causar rejeições falsas`
    });
  }
  
  // Check match count
  if (config.match_count < 3) {
    issues.push({
      type: 'warning',
      message: `Match count baixo (${config.match_count}) pode perder contexto`
    });
  }
  
  // Check documents
  if (config.total_documents === 0) {
    issues.push({
      type: 'error',
      message: 'Nenhum documento disponível para este chat'
    });
  }
  
  // Check unreadable documents
  const { data: unreadableDocs } = await supabase
    .from('documents')
    .select('id')
    .eq('target_chat', config.chat_type)
    .eq('is_readable', false);
  
  if (unreadableDocs && unreadableDocs.length > 0) {
    issues.push({
      type: 'warning',
      message: `${unreadableDocs.length} documento(s) ilegível(is)`
    });
  }
  
  return issues;
}
```

---

## Analytics e Métricas

### Tabela `rag_analytics`

**Campos Tracked**:

```typescript
interface RAGAnalytics {
  query: string;                  // Query do usuário
  target_chat: string;            // 'study' ou 'health'
  search_type: string;            // 'vector', 'keyword', 'fulltext'
  results_count: number;          // Número de chunks retornados
  top_similarity_score: number;   // Score do melhor resultado
  latency_ms: number;             // Tempo de busca
  success_status: boolean;        // Sucesso da operação
  match_threshold: number;        // Threshold usado
  session_id: string;             // ID da sessão
  metadata: any;                  // Dados adicionais
  created_at: timestamp;
}
```

### Métricas Disponíveis

**RagMetricsTab Component**:

```typescript
// 1. Quick Metrics
- Total de documentos por chat
- Total de chunks
- Taxa de sucesso (%)
- Falhas totais

// 2. Evolução Temporal
- Uploads por dia (completed/failed)
- Chart de área empilhada

// 3. Tags Mais Usadas
- Top 10 tags
- Bar chart horizontal

// 4. Qualidade dos Embeddings
- Distribuição de normas vetoriais
- Detecção de embeddings de baixa qualidade

// 5. Analytics de Busca
- Latência média (ms)
- Taxa de sucesso (%)
- Similarity score médio
- Queries mais frequentes
```

### Queries de Analytics

```typescript
// Taxa de sucesso geral
const successRate = await supabase
  .from('rag_analytics')
  .select('success_status')
  .then(data => {
    const total = data.data.length;
    const success = data.data.filter(r => r.success_status).length;
    return (success / total) * 100;
  });

// Latência média por tipo de busca
const avgLatency = await supabase
  .from('rag_analytics')
  .select('search_type, latency_ms')
  .then(data => {
    const byType = groupBy(data.data, 'search_type');
    return Object.entries(byType).map(([type, records]) => ({
      type,
      avg_latency: mean(records.map(r => r.latency_ms))
    }));
  });

// Top queries
const topQueries = await supabase
  .from('rag_analytics')
  .select('query')
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## Troubleshooting

### Problema: Documentos não estão sendo encontrados

**Diagnóstico**:

1. **Verificar se documento está completed**:
```sql
SELECT filename, status, is_readable 
FROM documents 
WHERE target_chat = 'study';
```

2. **Verificar embeddings**:
```sql
SELECT COUNT(*) 
FROM document_chunks 
WHERE embedding IS NOT NULL;
```

3. **Testar busca manualmente**:
```typescript
const { data } = await supabase.functions.invoke('search-documents', {
  body: {
    query: "test query",
    targetChat: "study",
    matchThreshold: 0.05 // Threshold bem baixo para teste
  }
});
```

**Soluções**:
- Threshold muito alto → Reduzir para 0.10 ou 0.05
- Embeddings ausentes → Reprocessar documento
- Documento ilegível → Verificar qualidade do PDF original

---

### Problema: Tags não aparecem no escopo

**Diagnóstico**:

1. **Verificar tags do documento**:
```sql
SELECT tag_name, tag_type, confidence 
FROM document_tags dt
JOIN documents d ON dt.document_id = d.id
WHERE d.target_chat = 'study'
  AND dt.tag_type = 'parent';
```

2. **Verificar confidence**:
- Somente parent tags com confidence >= 0.70 são incluídas no escopo

**Soluções**:
- Confidence baixa → Reprocessar com novo prompt de tags
- Tags ausentes → Executar suggest-document-tags manualmente
- Trigger não disparado → Verificar se trigger existe e está ativo

---

### Problema: Chat não usa contexto RAG

**Diagnóstico**:

1. **Verificar system prompt**:
```typescript
const { data: config } = await supabase
  .from('chat_config')
  .select('system_prompt_base, rag_priority_instruction')
  .eq('chat_type', 'study')
  .single();

console.log(config);
```

2. **Verificar se há contexto disponível**:
```typescript
const { data: results } = await supabase.functions.invoke('search-documents', {
  body: { query: "test", targetChat: "study" }
});

console.log(results.results.length); // Deve ser > 0
```

**Soluções**:
- System prompt incorreto → Atualizar com instrução RAG Priority
- Sem resultados → Adicionar mais documentos ou reduzir threshold
- SLM ignorando contexto → Reformular system prompt com mais ênfase

---

### Problema: Performance lenta

**Diagnóstico**:

1. **Verificar latência no rag_analytics**:
```sql
SELECT 
  AVG(latency_ms) as avg_latency,
  MAX(latency_ms) as max_latency,
  search_type
FROM rag_analytics
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY search_type;
```

2. **Verificar índices**:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'document_chunks';
```

**Soluções**:
- Criar índice HNSW para busca vetorial mais rápida
- Reduzir match_count (de 5 para 3)
- Implementar cache de embeddings de queries frequentes

---

## Referências Técnicas

### Modelos Utilizados

- **Embeddings**: KY AI text-embedding-3-small (1536 dimensões)
- **SLMs**: KY AI (google/gemini-2.5-flash)
- **Vector Store**: PostgreSQL com pgvector extension
- **Similarity Metric**: Distância cosseno (`<=>` operator)

### Thresholds Recomendados

```
Busca Vetorial:
- Alta precisão: 0.20 - 0.30
- Balanceado: 0.15 (padrão)
- Alta recall: 0.10 - 0.12

Busca por Keywords:
- Sempre: 0.50 (fallback fixo)
```

### Configurações de Produção

```typescript
const PRODUCTION_CONFIG = {
  match_threshold: 0.15,
  match_count: 5,
  chunk_size: 1500, // palavras
  embedding_dimensions: 1536,
  max_tokens_llm: 8192,
  timeout_search_ms: 5000,
  timeout_generation_ms: 30000
};
```

---

## Manutenção

### Tarefas Regulares

1. **Cleanup de documentos stuck** (Cron Job - a cada 2 minutos):
```typescript
// Edge function: cleanup-stuck-documents
// Reclassifica documentos com status='processing' por > 2 minutos
```

2. **Recalcular estatísticas** (Manual ou semanal):
```sql
SELECT initialize_chat_config_stats();
```

3. **Backup de embeddings** (Mensal):
```bash
pg_dump -t document_chunks > embeddings_backup_$(date +%Y%m%d).sql
```

### Monitoramento

**Alertas recomendados**:
- Taxa de falha > 10%
- Latência média > 3000ms
- Documentos ilegíveis > 20%
- Documentos stuck > 5

---

## Changelog

### v1.0.0 (Implementação Inicial)
- Pipeline ETL completo
- Busca vetorial básica
- Integração com chat health

### v1.1.0 (Tags Hierárquicas)
- Sistema de tags parent/child
- Auto-categorização com SLM
- Escopo dinâmico

### v1.2.0 (Busca Híbrida)
- Fallback para keywords
- Full-text search
- Logs de analytics

### v1.3.0 (Health Checks)
- Validação de configurações
- Detecção de problemas
- Alertas automáticos

---

## Contato e Suporte

Para dúvidas sobre a implementação RAG:
- **Documentação Técnica**: `/admin` → Tab "Documentos"
- **Diagnóstico**: `/admin` → Tab "RAG Diagnostics"
- **Métricas**: `/admin` → Tab "RAG Metrics"
- **Configurações**: `/admin` → Tab "Chat & Conversas"
