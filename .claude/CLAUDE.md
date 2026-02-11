# IconsAI - Ecossistema de Sistemas Inteligentes

## 🚨 REGRAS CRÍTICAS (SEMPRE SEGUIR)

### 1. QUESTIONAR ANTES DE AGIR
- **NUNCA** assuma compreensão completa
- **SEMPRE** criar questionário de validação antes de implementar
- **SEMPRE** perguntar quando houver dúvidas, mesmo com bypass ativado
- **SEMPRE** explicar o que foi compreendido antes de começar

### 2. CÁLCULOS E PROCESSAMENTO
- ❌ **NEVER**: Cálculos matemáticos no frontend/JavaScript
- ✅ **ALWAYS**: Todos os cálculos em Python no backend
- ❌ **NEVER**: Dados hardcoded em código
- ✅ **ALWAYS**: Dados vindos de APIs/banco de dados

### 3. GESTÃO DE VOZ (TTS)
- ❌ **NEVER**: Usar voz do browser (window.speechSynthesis)
- ✅ **ALWAYS**: Usar OpenAI TTS (gpt-4o-mini-tts) ou ElevenLabs
- ✅ **ALWAYS**: Aplicar humanização conforme módulo (ver seção Voice)
- ✅ **ALWAYS**: Incluir instruções de voz personalizadas

### 4. RASTREABILIDADE DE DADOS
- ✅ **ALWAYS**: Toda informação precisa ter fonte registrada
- ✅ **ALWAYS**: Criar/atualizar tabela `fontes_dados` em TODOS os projetos
- ✅ **ALWAYS**: Incluir: fonte, URL, data coleta, periodicidade

### 5. MUDANÇAS NÃO SOLICITADAS
- ❌ **NEVER**: Alterar código que não foi pedido
- ❌ **NEVER**: "Melhorar" código sem autorização explícita
- ✅ **ONLY**: Fazer exatamente o que foi solicitado
- ✅ **IF**: Sugestões → perguntar antes de implementar

### 6. ENGENHARIA DE SOFTWARE
- ✅ **ALWAYS**: Seguir SOLID principles
- ✅ **ALWAYS**: Código testável e modular
- ✅ **ALWAYS**: TypeScript strict mode (frontend)
- ✅ **ALWAYS**: Type hints obrigatórios (Python)
- ✅ **ALWAYS**: Validação com Zod (TS) ou Pydantic (Python)

### 7. SEPARAÇÃO FRONTEND/BACKEND (CRÍTICO)
- ❌ **NEVER**: Processar dados no frontend
- ❌ **NEVER**: Cálculos, embeddings, IA, ETL no React
- ❌ **NEVER**: Lógica de negócio no cliente
- ✅ **ALWAYS**: Frontend = UI + chamadas HTTP APENAS
- ✅ **ALWAYS**: Backend = Processamento, Lógica, Dados, IA
- ✅ **ALWAYS**: Separar estrutura de código backend/frontend

### 8. SEGURANÇA
- ❌ **NEVER**: Expor secrets em código
- ❌ **NEVER**: SQL direto sem prepared statements
- ✅ **ALWAYS**: Validar input do usuário
- ✅ **ALWAYS**: Sanitizar dados antes de armazenar
- ✅ **ALWAYS**: Usar variáveis de ambiente

---

## 📁 ESTRUTURA DOS PROJETOS

### Projetos Principais

```
iconsai-ecosystem/
├── iconsai-production/     → Sidebar/Admin (Vite + React + TS)
│   ├── src/
│   │   ├── components/     → UI components (shadcn/ui)
│   │   ├── modules/        → Feature modules
│   │   │   └── pwa-voice/  → Voice system (TTS/STT)
│   │   ├── config/         → voice-config.ts (presets)
│   │   ├── services/       → API integration
│   │   └── utils/          → Helpers
│   └── supabase/           → Edge Functions
│
├── orcamento-fiscal-municipios/ → Análise Fiscal (MAIS BEM ESTRUTURADO)
│   ├── backend/            → Python microservices
│   ├── src/                → React frontend
│   ├── scripts/            → ETL scripts (Python)
│   ├── mcp-servers/        → MCP integrations (SICONFI, etc)
│   ├── services/           → Microservices (Docker)
│   │   ├── tts-service/    → Voice synthesis
│   │   ├── auth-service/   → Authentication
│   │   ├── api-gateway/    → Gateway
│   │   └── geo-service/    → Geographic data
│   └── docs/               → Documentation (FONTES_DADOS.md)
│
└── scraping-hub/           → Web Scraping (MAIS PROBLEMÁTICO)
    ├── src/
    │   ├── scrapers/       → Scrapers individuais
    │   ├── services/       → Business logic
    │   └── database/       → DB models
    ├── api/                → FastAPI routes
    └── tests/              → pytest tests
```

### Status dos Projetos

| Projeto | Status | Stack | Principais Desafios |
|---------|--------|-------|---------------------|
| **orcamento-fiscal-municipios** | ✅ Melhor estruturado | React + Python + Supabase | Cálculos complexos, ETL massivo |
| **iconsai-production** | ⚠️ Adequado | React + TS + Supabase | Gestão de voz, múltiplos módulos |
| **scraping-hub** | ⚠️ Problemático | Python + FastAPI | Quebra frequente, manutenção alta |

---

## 🎯 STACK TECNOLÓGICA

### Frontend (iconsai-production, orcamento-fiscal)
```typescript
// Stack principal
- Vite + React 18
- TypeScript 5+ (strict mode)
- shadcn/ui + Radix UI
- TailwindCSS + Framer Motion
- Zustand (state management)
- React Query (@tanstack/react-query)
- Zod (validation)
```

### Backend (microservices)
```python
# Stack principal
- Python 3.11+
- FastAPI (async/await)
- Pydantic (validation)
- SQLAlchemy (ORM)
- Pytest (testing)
- Docker + Docker Compose
```

### Database & Infrastructure
```
- Supabase (PostgreSQL + Edge Functions)
- n8n (automação)
- DigitalOcean (hospedagem)
```

---

## 🏗️ ARQUITETURA BACKEND (CRÍTICO)

### Princípio Fundamental
```
SEPARAÇÃO ABSOLUTA:
Backend = Processamento, Lógica, Dados, IA
Frontend = UI, Apresentação, Interação

NUNCA processar/calcular/embeddings/IA no frontend
```

### Arquitetura em 3 Camadas

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React/TS)                   │
│              Apenas UI e chamadas HTTP                   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
                     ↓
┌─────────────────────────────────────────────────────────┐
│              CAMADA 1: API Gateway (Node.js)            │
│    • Autenticação (JWT)                                 │
│    • Rate limiting                                      │
│    • Validação de input                                 │
│    • Roteamento                                         │
│    • Logging/Auditoria                                  │
│    • WebSocket/SSE (realtime)                           │
└────────────┬──────────────────────────┬─────────────────┘
             │                          │
             ↓                          ↓
┌────────────────────────┐  ┌──────────────────────────────┐
│ CAMADA 2: Serviços     │  │ CAMADA 3: Processamento      │
│ Internos (Node/Python) │  │ Pesado (Python)              │
│                        │  │                              │
│ • Lógica de negócio    │  │ • RAG (ingestão + retrieval) │
│ • Integrações APIs     │  │ • Embeddings/Rerank          │
│ • Workflows            │  │ • ETL/CRON                   │
│ • Orquestração         │  │ • Estatística/Analytics      │
└────────┬───────────────┘  │ • Workers (filas)            │
         │                  │ • Whisper/TTS                │
         ↓                  └──────────┬───────────────────┘
┌─────────────────────────────────────┴───────────────────┐
│              Supabase PostgreSQL                         │
│    • Dados transacionais                                │
│    • pgvector (RAG)                                     │
│    • PostGIS (geolocalização)                           │
│    • Materialized Views (analytics pré-computadas)      │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 DECISÕES DE BACKEND: Node.js vs Python

### Regras de Bolso (MEMORIZE)

```
🔥 GARGALO É CONEXÃO/ESPERA → Node.js
🔥 GARGALO É CÁLCULO/MODELO/DADO → Python  
🔥 TEM OS DOIS → Node na borda + Python no núcleo
```

### Use Node.js Quando:

✅ **I/O-bound**: Muitas chamadas a banco, cache, APIs externas  
✅ **Alta concorrência**: Muitas requisições simultâneas (1000+ req/s)  
✅ **Baixa latência**: Resposta < 100ms requerida  
✅ **Realtime**: WebSocket, SSE, notificações push, streaming de eventos  
✅ **API Gateway**: Orquestração, roteamento, autenticação, rate limiting  
✅ **Serverless**: Lambda, Edge Functions (cold start ~100ms)  
✅ **BFF**: Backend-for-Frontend agregando múltiplos serviços

**Padrões Node.js:**
```typescript
// 1. API Gateway/Orquestrador
app.get('/api/municipios/:id/fiscal', async (req, res) => {
  // Valida, autentica, rate limit
  await validateAuth(req);
  await checkRateLimit(req.user.id);
  
  // Orquestra múltiplos serviços
  const [dados, indicadores, tendencias] = await Promise.all([
    fetchDadosMunicipio(id),
    pythonService.calcularIndicadores(id),  // ← Chama Python
    supabase.from('tendencias_cache').select()
  ]);
  
  res.json({ dados, indicadores, tendencias });
});

// 2. Realtime (WebSocket)
io.on('connection', (socket) => {
  socket.on('subscribe:municipio', async (codigoIbge) => {
    // Cliente se inscreve para updates
    socket.join(`municipio:${codigoIbge}`);
  });
});

// 3. Autenticação
app.post('/auth/login', async (req, res) => {
  const user = await validateCredentials(req.body);
  const token = jwt.sign({ userId: user.id }, SECRET);
  res.json({ token });
});
```

---

### Use Python Quando:

✅ **CPU-bound**: Cálculos matemáticos, estatística, ML, transformações pesadas  
✅ **AI/ML/LLM**: RAG (ingestão + retrieval + rerank), embeddings, classificação  
✅ **NLP/Audio**: Whisper (STT), análise de sentimento, NER, tradução  
✅ **ETL**: Pipelines de dados, normalização, deduplicação, transformação massiva  
✅ **Analytics**: Correlações, tendências, sazonalidade, regressões, clustering  
✅ **Workers**: Processamento assíncrono em filas (jobs pesados)  
✅ **Batch Jobs**: CRON contínuo, processamento noturno, full table scans  
✅ **Data Science**: NumPy, Pandas, SciPy, statsmodels, scikit-learn

**Padrões Python:**
```python
# 1. Serviço RAG
@app.post("/rag/ingest")
async def ingest_document(file: UploadFile):
    """Processa documento para RAG (NUNCA no frontend)"""
    
    # 1. Extrai texto
    text = await extract_text(file)
    
    # 2. Chunking
    chunks = chunk_text(text, chunk_size=512, overlap=50)
    
    # 3. Embeddings (OpenAI/local)
    embeddings = await generate_embeddings(chunks)
    
    # 4. Armazena no pgvector
    await db.execute(
        "INSERT INTO embeddings (chunk, embedding, metadata) VALUES ($1, $2, $3)",
        chunks, embeddings, metadata
    )
    
    return {"status": "success", "chunks": len(chunks)}

# 2. Analytics/Estatística
@app.get("/analytics/tendencias/{codigo_ibge}")
async def calcular_tendencias(codigo_ibge: str):
    """Cálculos estatísticos pesados (NUNCA no frontend)"""
    
    # Busca dados históricos
    dados = await fetch_historical_data(codigo_ibge)
    
    # Análise estatística
    import numpy as np
    from scipy import stats
    
    # Tendência linear
    x = np.arange(len(dados))
    y = np.array([d.valor for d in dados])
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    
    # Sazonalidade
    from statsmodels.tsa.seasonal import seasonal_decompose
    decomposition = seasonal_decompose(y, model='additive', period=12)
    
    # Armazena resultado em cache
    await db.execute(
        "INSERT INTO tendencias_cache (codigo_ibge, slope, r2, data) VALUES ($1, $2, $3, NOW())",
        codigo_ibge, slope, r_value**2
    )
    
    return {
        "tendencia": "crescente" if slope > 0 else "decrescente",
        "r2": r_value**2,
        "sazonalidade": decomposition.seasonal.tolist()
    }

# 3. Worker ETL (Celery/RQ)
@celery.task
def process_siconfi_batch(municipios: list[str]):
    """Worker assíncrono - processa em background"""
    
    for codigo_ibge in municipios:
        # ETL pesado
        data = fetch_siconfi_api(codigo_ibge)
        normalized = normalize_data(data)
        validate_and_save(normalized)
        
        # Atualiza cache de indicadores
        recalculate_indicators(codigo_ibge)
```

---

### Arquitetura Híbrida (RECOMENDADO)

#### Quando Usar Híbrido:
- ✅ API pública grande e concorrente
- ✅ Núcleo de IA/processamento pesado
- ✅ CRON contínuo + ETL + analytics
- ✅ Separação clara de responsabilidades

#### Divisão Clara:

**Node.js (Borda/Edge):**
- API externa pública
- Autenticação (JWT, OAuth)
- Rate limiting por tenant/API key
- Auditoria e logging (request_id, user_id, tenant_id)
- Roteamento e validação de input
- WebSocket/SSE (realtime)
- Chamadas para serviços internos Python

**Python (Núcleo Analítico):**
- RAG (ingestão + retrieval + ranking)
- Embeddings e re-ranking
- Transcrição (Whisper), NLP
- Jobs batch/ETL (CRON)
- Workers assíncronos (filas)
- Estatística, ML, Analytics
- Processamento pesado (> 1s)

#### Integração:

```
Opção 1: HTTP/REST (simples)
Node ──HTTP──> Python FastAPI

Opção 2: gRPC (alta performance)
Node ──gRPC──> Python gRPC Server

Opção 3: Fila/Eventos (robusto, RECOMENDADO)
Node ──publish──> Redis Queue ──consume──> Python Workers
```

**Fluxo Híbrido Típico:**

```
Cliente → Node.js Gateway → Python Services → PostgreSQL
                ↓
            Redis Queue
                ↓
          Python Workers
```

**Fluxo Típico:**
```typescript
// Node.js - API pública (rápida)
app.post('/api/municipios/analisar', async (req, res) => {
  const { codigoIbge, periodo } = req.body;
  
  // 1. Valida
  await validateRequest(req);
  
  // 2. Publica job na fila (não espera processar)
  const jobId = await queue.add('analise-fiscal', {
    codigoIbge,
    periodo,
    userId: req.user.id
  });
  
  // 3. Responde imediatamente
  res.json({ 
    jobId, 
    status: 'processing',
    estimatedTime: '30s'
  });
});

// Cliente pode consultar status
app.get('/api/jobs/:id', async (req, res) => {
  const job = await queue.getJob(req.params.id);
  res.json({ 
    status: job.status, 
    progress: job.progress,
    result: job.returnvalue 
  });
});
```

```python
# Python - Worker (processa pesado)
@celery.task(bind=True)
def analise_fiscal_completa(self, codigo_ibge: str, periodo: str):
    """Processa análise fiscal completa"""
    
    # Atualiza progresso
    self.update_state(state='PROGRESS', meta={'progress': 10})
    
    # 1. Coleta dados
    rreo = fetch_rreo(codigo_ibge, periodo)
    rgf = fetch_rgf(codigo_ibge, periodo)
    self.update_state(state='PROGRESS', meta={'progress': 30})
    
    # 2. Calcula indicadores
    indicadores = calcular_indicadores_lrf(rreo, rgf)
    self.update_state(state='PROGRESS', meta={'progress': 60})
    
    # 3. Análise estatística
    tendencias = calcular_tendencias_historicas(codigo_ibge)
    correlacoes = calcular_correlacoes(indicadores)
    self.update_state(state='PROGRESS', meta={'progress': 90})
    
    # 4. Armazena resultado
    await save_analysis_result(codigo_ibge, {
        'indicadores': indicadores,
        'tendencias': tendencias,
        'correlacoes': correlacoes,
        'timestamp': datetime.utcnow()
    })
    
    return {'status': 'completed', 'codigo_ibge': codigo_ibge}
```

---

## 🎯 BLUEPRINT COMPLETO - MICROSERVICES

### Serviço 1: API Gateway (Node.js)

**Responsabilidades:**
- Autenticação (JWT)
- Rate limiting por tenant/API key
- Validação de input (Zod)
- Logging estruturado (request_id, user_id, tenant_id)
- Versionamento (/v1, /v2)
- Circuit breaker para serviços internos
- CORS, HTTPS, security headers

**Stack:**
- NestJS ou Fastify
- Redis (rate limit + session)
- Zod (validation)
- Winston (logging)

**Endpoints Externos:**
```typescript
GET    /v1/municipios/:codigo_ibge
GET    /v1/municipios/:codigo_ibge/fiscal
POST   /v1/municipios/:codigo_ibge/analisar
GET    /v1/tendencias/:codigo_ibge
GET    /v1/comparar?codigos=1234567,7654321
POST   /v1/rag/query
GET    /v1/jobs/:job_id
```

**NÃO faz:**
- Embeddings
- Cálculos estatísticos
- ETL
- Processamento de arquivos

---

### Serviço 2: RAG Service (Python/FastAPI)

**Responsabilidades:**
- Ingestão de documentos (PDF, HTML, TXT)
- Chunking inteligente
- Embeddings (OpenAI/local)
- Vector search (pgvector)
- Reranking (quando necessário)
- Citações e trechos

**Stack:**
- FastAPI
- LangChain/LlamaIndex
- OpenAI API / Sentence Transformers
- pgvector (Supabase)

**Arquitetura Interna:**
```python
# Pipeline 1: Ingestão
class RAGIngestPipeline:
    async def process(self, file: UploadFile):
        # 1. Extrai texto
        text = await self.extract_text(file)
        
        # 2. Chunking com overlap
        chunks = self.chunk_text(
            text, 
            chunk_size=512, 
            overlap=50,
            strategy='semantic'  # ou 'fixed'
        )
        
        # 3. Embeddings
        embeddings = await self.generate_embeddings(chunks)
        
        # 4. Metadata
        metadata = {
            'source': file.filename,
            'tenant_id': get_tenant_id(),
            'data_ingestao': datetime.utcnow(),
            'tipo_documento': detect_document_type(file)
        }
        
        # 5. Armazena no pgvector
        await self.store_embeddings(chunks, embeddings, metadata)

# Pipeline 2: Consulta
class RAGQueryPipeline:
    async def query(self, question: str, filters: dict):
        # 1. Query embedding
        query_emb = await self.generate_embedding(question)
        
        # 2. Vector search + filtros
        results = await db.execute("""
            SELECT chunk, metadata, 
                   1 - (embedding <=> $1) as similarity
            FROM embeddings
            WHERE metadata->>'tenant_id' = $2
              AND metadata->>'tipo_documento' = $3
            ORDER BY embedding <=> $1
            LIMIT 20
        """, query_emb, filters['tenant_id'], filters['tipo'])
        
        # 3. Rerank (opcional - para top 5 final)
        if len(results) > 5:
            reranked = await self.rerank(question, results[:20])
            results = reranked[:5]
        
        # 4. Formata resposta com citações
        return {
            'chunks': results,
            'sources': self.extract_sources(results)
        }
```

**Endpoints Internos:**
```python
POST   /ingest           # Upload documento
POST   /query            # Busca semântica
GET    /status/:doc_id   # Status ingestão
DELETE /document/:id     # Remove documento
POST   /reindex          # Reindexação
```

---

### Serviço 3: ETL & Schedulers (Python)

**Responsabilidades:**
- Jobs CRON contínuos
- Ingestão de APIs externas (SICONFI, IBGE, etc)
- Normalização/deduplicação
- Atualização incremental
- Feature engineering (para analytics)

**Stack:**
- APScheduler ou Celery Beat
- Celery workers
- Redis/RabbitMQ (broker)
- SQLAlchemy

**Jobs Principais:**
```python
# Job 1: Importação diária SICONFI
@scheduler.scheduled_job('cron', hour=2, minute=0)
async def import_siconfi_daily():
    """Roda todo dia às 2h"""
    
    # 1. Lista municípios que precisam atualizar
    municipios = await get_municipios_to_update()
    
    # 2. Publica jobs na fila
    for codigo_ibge in municipios:
        celery.send_task(
            'tasks.import_siconfi',
            args=[codigo_ibge],
            queue='high_priority'
        )

# Job 2: Cálculo de tendências semanais
@scheduler.scheduled_job('cron', day_of_week='sun', hour=4)
async def calculate_trends_weekly():
    """Roda todo domingo às 4h"""
    
    municipios = await get_all_active_municipios()
    
    for codigo_ibge in municipios:
        # Calcula tendências dos últimos 12 meses
        await calculate_and_cache_trends(codigo_ibge, periods=12)

# Worker: Importação SICONFI
@celery.task(bind=True, max_retries=3)
def import_siconfi(self, codigo_ibge: str):
    try:
        # 1. Fetch API
        data = fetch_siconfi_api(codigo_ibge, year=2024)
        
        # 2. Normaliza
        normalized = normalize_siconfi_data(data)
        
        # 3. Deduplica
        deduplicated = remove_duplicates(normalized)
        
        # 4. Valida com Pydantic
        validated = [SiconfiRecord(**row) for row in deduplicated]
        
        # 5. Salva no banco
        await bulk_insert(validated)
        
        # 6. Registra fonte
        await register_data_source(
            nome='SICONFI RREO',
            codigo_ibge=codigo_ibge,
            data_coleta=datetime.utcnow()
        )
        
    except Exception as e:
        # Retry com backoff exponencial
        self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
```

**Configuração Celery:**
```python
# celery_config.py
from celery import Celery

celery = Celery(
    'etl_workers',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1'
)

celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Sao_Paulo',
    enable_utc=True,
    
    # Filas diferentes para prioridades
    task_routes={
        'tasks.import_siconfi': {'queue': 'high_priority'},
        'tasks.calculate_trends': {'queue': 'low_priority'},
    },
    
    # Retry policy
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Rate limiting
    task_annotations={
        'tasks.import_siconfi': {'rate_limit': '10/m'},
    }
)
```

---

### Serviço 4: Analytics/Modeling (Python)

**Responsabilidades:**
- Correlações
- Tendências (linear, polinomial, sazonalidade)
- Outliers
- Regressões
- Clustering
- Escreve resultados em tabelas materializadas

**Stack:**
- FastAPI
- NumPy, Pandas, SciPy
- statsmodels
- scikit-learn

```python
# service/analytics.py
from fastapi import FastAPI
import numpy as np
from scipy import stats
from statsmodels.tsa.seasonal import seasonal_decompose

app = FastAPI()

@app.post("/analytics/tendencias")
async def calcular_tendencias(request: TendenciaRequest):
    """
    Calcula tendências históricas.
    
    NUNCA chamar do frontend - apenas via API Gateway.
    """
    codigo_ibge = request.codigo_ibge
    
    # 1. Busca histórico (últimos 3 anos)
    query = """
        SELECT exercicio, rcl, despesa_pessoal, percentual_dp_rcl
        FROM indicadores_fiscais
        WHERE codigo_ibge = $1
        ORDER BY exercicio
    """
    dados = await db.fetch(query, codigo_ibge)
    
    # 2. Prepara séries temporais
    x = np.array([d['exercicio'] for d in dados])
    y_rcl = np.array([d['rcl'] for d in dados])
    y_dp = np.array([d['despesa_pessoal'] for d in dados])
    
    # 3. Regressão linear para RCL
    slope_rcl, intercept_rcl, r_value_rcl, p_value_rcl, _ = stats.linregress(
        x, y_rcl
    )
    
    # 4. Sazonalidade (se dados mensais)
    if len(dados) >= 24:  # Mínimo 2 anos
        decomposition = seasonal_decompose(
            y_rcl, 
            model='additive', 
            period=12
        )
        sazonalidade = decomposition.seasonal.tolist()
    else:
        sazonalidade = None
    
    # 5. Detecção de outliers (Z-score)
    z_scores = np.abs(stats.zscore(y_dp))
    outliers = np.where(z_scores > 3)[0].tolist()
    
    # 6. Projeção (próximos 2 anos)
    anos_futuros = np.array([max(x) + 1, max(x) + 2])
    projecao_rcl = slope_rcl * anos_futuros + intercept_rcl
    
    # 7. Armazena em tabela materializada
    resultado = {
        'codigo_ibge': codigo_ibge,
        'tendencia_rcl': {
            'slope': float(slope_rcl),
            'r2': float(r_value_rcl ** 2),
            'direcao': 'crescente' if slope_rcl > 0 else 'decrescente'
        },
        'sazonalidade': sazonalidade,
        'outliers': outliers,
        'projecao': {
            str(int(ano)): float(valor) 
            for ano, valor in zip(anos_futuros, projecao_rcl)
        },
        'data_calculo': datetime.utcnow()
    }
    
    await db.execute("""
        INSERT INTO tendencias_cache (codigo_ibge, resultado, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (codigo_ibge) DO UPDATE
        SET resultado = EXCLUDED.resultado, updated_at = NOW()
    """, codigo_ibge, json.dumps(resultado))
    
    return resultado

@app.post("/analytics/correlacoes")
async def calcular_correlacoes(request: CorrelacaoRequest):
    """
    Calcula matriz de correlação entre indicadores.
    """
    codigos_ibge = request.codigos_ibge
    
    # Busca dados de múltiplos municípios
    dados = await fetch_indicators_matrix(codigos_ibge)
    
    # Matriz de correlação (Pearson)
    df = pd.DataFrame(dados)
    correlation_matrix = df.corr(method='pearson')
    
    # P-values para significância
    p_values = calculate_pvalues(df)
    
    # Filtra apenas correlações significativas (p < 0.05)
    significant = correlation_matrix.where(p_values < 0.05)
    
    return {
        'correlations': significant.to_dict(),
        'p_values': p_values.to_dict(),
        'sample_size': len(dados)
    }
```

---

### Serviço 5: Geo Service (PostGIS)

**Responsabilidades:**
- Queries geográficas
- Radius search
- Nearest neighbors
- Polygons/boundaries
- Clustering espacial
- Geofencing

**Stack:**
- PostGIS (extension do PostgreSQL)
- GeoAlchemy2 (Python ORM)
- Shapely (geometrias)

```python
# service/geo.py
from geoalchemy2 import Geometry
from shapely.geometry import Point
from sqlalchemy import func

@app.get("/geo/municipios/proximos")
async def municipios_proximos(
    lat: float, 
    lng: float, 
    radius_km: float = 100
):
    """
    Encontra municípios num raio de X km.
    """
    
    # Point do usuário
    user_point = f'POINT({lng} {lat})'
    
    # Query PostGIS
    query = """
        SELECT 
            codigo_ibge,
            nome,
            ST_Distance(
                ST_GeogFromText($1),
                location::geography
            ) / 1000 as distancia_km
        FROM municipios
        WHERE ST_DWithin(
            location::geography,
            ST_GeogFromText($1),
            $2 * 1000  -- metros
        )
        ORDER BY distancia_km
    """
    
    result = await db.fetch(query, user_point, radius_km)
    return result

@app.post("/geo/cluster")
async def cluster_municipios(estados: list[str]):
    """
    Agrupa municípios geograficamente (k-means espacial).
    """
    
    # Busca coordenadas
    coords = await db.fetch("""
        SELECT codigo_ibge, ST_X(location) as lng, ST_Y(location) as lat
        FROM municipios
        WHERE uf = ANY($1)
    """, estados)
    
    # K-means clustering
    from sklearn.cluster import KMeans
    
    X = np.array([[c['lng'], c['lat']] for c in coords])
    kmeans = KMeans(n_clusters=5, random_state=42)
    labels = kmeans.fit_predict(X)
    
    # Adiciona cluster_id aos municípios
    result = [
        {**coords[i], 'cluster_id': int(labels[i])}
        for i in range(len(coords))
    ]
    
    return {
        'clusters': 5,
        'municipios': result,
        'centroids': kmeans.cluster_centers_.tolist()
    }
```

---

## 🗄️ ESTRUTURA DE TABELAS (PostgreSQL/Supabase)

### Tabelas Raw (Dados Brutos)
```sql
-- Dados direto das APIs
CREATE TABLE raw_siconfi_rreo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_ibge TEXT NOT NULL,
  exercicio INTEGER NOT NULL,
  payload JSONB NOT NULL,  -- JSON completo da API
  data_coleta TIMESTAMPTZ DEFAULT NOW(),
  fonte TEXT NOT NULL
);

CREATE INDEX idx_raw_siconfi_codigo ON raw_siconfi_rreo(codigo_ibge, exercicio);
```

### Tabelas Staging (Normalizado)
```sql
-- Dados normalizados e validados
CREATE TABLE stg_indicadores_fiscais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_ibge TEXT NOT NULL,
  exercicio INTEGER NOT NULL,
  rcl DECIMAL(15,2) NOT NULL CHECK (rcl > 0),
  despesa_pessoal DECIMAL(15,2) NOT NULL CHECK (despesa_pessoal >= 0),
  percentual_dp_rcl DECIMAL(5,2),
  data_processamento TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(codigo_ibge, exercicio)
);
```

### Tabelas Fato (Dimensionais)
```sql
-- Star schema para analytics
CREATE TABLE fct_indicadores_fiscais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_ibge TEXT NOT NULL,
  dim_tempo_id INTEGER REFERENCES dim_tempo(id),
  rcl DECIMAL(15,2),
  despesa_pessoal DECIMAL(15,2),
  percentual_dp_rcl DECIMAL(5,2),
  status_lrf TEXT CHECK (status_lrf IN ('regular', 'alerta', 'critico'))
);

CREATE TABLE dim_tempo (
  id SERIAL PRIMARY KEY,
  exercicio INTEGER NOT NULL,
  bimestre INTEGER CHECK (bimestre BETWEEN 1 AND 6),
  ano INTEGER,
  trimestre INTEGER
);

CREATE TABLE dim_municipio (
  codigo_ibge TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  regiao TEXT,
  populacao INTEGER,
  location GEOGRAPHY(POINT, 4326),  -- PostGIS
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabelas Agregadas (Cache/Performance)
```sql
-- Pré-computadas para leitura rápida
CREATE TABLE agg_tendencias (
  codigo_ibge TEXT PRIMARY KEY,
  tendencia_rcl JSONB,  -- {slope, r2, direcao}
  sazonalidade JSONB,
  outliers INTEGER[],
  projecao JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agg_comparacoes_regiao (
  regiao TEXT,
  exercicio INTEGER,
  media_rcl DECIMAL(15,2),
  media_dp_percentual DECIMAL(5,2),
  percentil_25 DECIMAL(15,2),
  percentil_75 DECIMAL(15,2),
  updated_at TIMESTAMPTZ,
  
  PRIMARY KEY (regiao, exercicio)
);

-- Materialized View para dashboards
CREATE MATERIALIZED VIEW mv_indicadores_latest AS
SELECT DISTINCT ON (codigo_ibge)
  codigo_ibge,
  exercicio,
  rcl,
  despesa_pessoal,
  percentual_dp_rcl,
  status_lrf
FROM fct_indicadores_fiscais
ORDER BY codigo_ibge, exercicio DESC;

CREATE UNIQUE INDEX ON mv_indicadores_latest(codigo_ibge);

-- Refresh agendado (CRON)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicadores_latest;
```

### Tabelas RAG (pgvector)
```sql
-- Embeddings para busca semântica
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chunk TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI text-embedding-3-small
  metadata JSONB NOT NULL,  -- {tenant_id, fonte, tipo_documento, data}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice HNSW para busca rápida
CREATE INDEX idx_embeddings_hnsw 
ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice GIN para filtros
CREATE INDEX idx_embeddings_metadata ON embeddings USING GIN(metadata);
```

---

## 🔄 FILAS (OBRIGATÓRIO)

### Arquitetura de Filas

```
┌─────────────┐         ┌──────────────┐         ┌────────────────┐
│  API Gateway │ ──────→ │  Redis Queue │ ──────→ │ Python Workers │
│   (Node.js)  │ publish │   (BullMQ)   │ consume │   (Celery)     │
└─────────────┘         └──────────────┘         └────────┬───────┘
                                                           │
                                                           ↓
                                                    ┌──────────────┐
                                                    │  PostgreSQL  │
                                                    └──────────────┘
```

### Filas por Prioridade

```python
# celery_config.py
CELERY_ROUTES = {
    # Alta prioridade (< 1 min)
    'tasks.calcular_indicador_urgente': {
        'queue': 'high_priority',
        'routing_key': 'high'
    },
    
    # Média prioridade (< 5 min)
    'tasks.import_siconfi': {
        'queue': 'medium_priority',
        'routing_key': 'medium'
    },
    
    # Baixa prioridade (background)
    'tasks.calculate_trends': {
        'queue': 'low_priority',
        'routing_key': 'low'
    },
    
    # Muito longo (horas)
    'tasks.full_etl_all_municipios': {
        'queue': 'batch_jobs',
        'routing_key': 'batch'
    }
}
```

### Exemplo Completo: Fluxo com Fila

```typescript
// Node.js - API Gateway
import Bull from 'bullmq';

const analysisQueue = new Bull('fiscal-analysis', {
  connection: { host: 'localhost', port: 6379 }
});

app.post('/api/municipios/:id/analisar-completa', async (req, res) => {
  const { id } = req.params;
  
  // Adiciona job na fila
  const job = await analysisQueue.add('analise-completa', {
    codigoIbge: id,
    userId: req.user.id,
    timestamp: new Date()
  }, {
    attempts: 3,  // Retry 3 vezes
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,  // Manter últimos 100 jobs
    removeOnFail: 500
  });
  
  // Responde imediatamente com job_id
  res.json({
    jobId: job.id,
    status: 'queued',
    estimatedTime: '45s',
    statusUrl: `/api/jobs/${job.id}`
  });
});

// Endpoint para checar status
app.get('/api/jobs/:id', async (req, res) => {
  const job = await analysisQueue.getJob(req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job não encontrado' });
  }
  
  const state = await job.getState();
  const progress = job.progress;
  
  res.json({
    id: job.id,
    status: state,  // 'completed', 'failed', 'active', 'waiting'
    progress: progress,
    result: state === 'completed' ? job.returnvalue : null,
    failedReason: state === 'failed' ? job.failedReason : null
  });
});
```

```python
# Python - Worker
from celery import Celery, Task

celery = Celery('workers')

class CallbackTask(Task):
    """Task com callback de progresso"""
    
    def on_success(self, retval, task_id, args, kwargs):
        # Notifica via websocket ou webhook
        notify_completion(task_id, retval)
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        # Loga erro e notifica
        log_error(task_id, exc)

@celery.task(base=CallbackTask, bind=True)
def analise_completa(self, codigo_ibge: str, user_id: str):
    """
    Análise fiscal completa - pode demorar 30-60s.
    
    NUNCA executar síncrono na API pública.
    """
    
    # 1. Coleta dados (10%)
    self.update_state(state='PROGRESS', meta={'progress': 10, 'step': 'Coletando dados'})
    rreo = fetch_rreo_api(codigo_ibge)
    rgf = fetch_rgf_api(codigo_ibge)
    
    # 2. Calcula indicadores (30%)
    self.update_state(state='PROGRESS', meta={'progress': 30, 'step': 'Calculando indicadores'})
    indicadores = calcular_indicadores_lrf(rreo, rgf)
    
    # 3. Análise estatística (60%)
    self.update_state(state='PROGRESS', meta={'progress': 60, 'step': 'Análise estatística'})
    tendencias = calcular_tendencias(codigo_ibge, periods=24)
    correlacoes = calcular_correlacoes_regionais(codigo_ibge)
    
    # 4. Comparação com pares (80%)
    self.update_state(state='PROGRESS', meta={'progress': 80, 'step': 'Comparando com pares'})
    peers = find_similar_municipios(codigo_ibge)
    comparacao = compare_with_peers(indicadores, peers)
    
    # 5. Salva resultado (100%)
    self.update_state(state='PROGRESS', meta={'progress': 100, 'step': 'Finalizando'})
    resultado_id = await save_analysis_result({
        'codigo_ibge': codigo_ibge,
        'user_id': user_id,
        'indicadores': indicadores,
        'tendencias': tendencias,
        'correlacoes': correlacoes,
        'comparacao': comparacao,
        'timestamp': datetime.utcnow()
    })
    
    return {
        'resultado_id': resultado_id,
        'codigo_ibge': codigo_ibge,
        'status': 'completed'
    }
```

---

## 📊 REGRAS DE OURO - PERFORMANCE & ARQUITETURA

### 1. Tudo > 300-800ms = Assíncrono (OBRIGATÓRIO)

```typescript
// ❌ NUNCA fazer síncrono se demorar > 300ms
app.get('/calcular-tendencias', async (req, res) => {
  const result = await heavyCalculation();  // 5 segundos ❌ INACEITÁVEL
  res.json(result);
});

// ✅ Usar fila + job assíncrono
app.post('/calcular-tendencias', async (req, res) => {
  const job = await queue.add('tendencias', req.body);
  res.json({ 
    jobId: job.id, 
    statusUrl: `/jobs/${job.id}`,
    estimatedTime: '45s'
  });
});

// Cliente pode pooling no status
app.get('/jobs/:id', async (req, res) => {
  const job = await queue.getJob(req.params.id);
  res.json({
    status: job.state,  // 'completed', 'active', 'failed'
    progress: job.progress,
    result: job.returnvalue
  });
});
```

### 2. API Pública NUNCA Calcula ao Vivo

```sql
-- ❌ NUNCA na API pública (milhões de linhas, 5-10s)
SELECT 
  AVG(percentual_dp_rcl) as media,
  STDDEV(percentual_dp_rcl) as desvio,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY percentual_dp_rcl) as mediana
FROM indicadores_fiscais
WHERE regiao = 'Sudeste'
  AND exercicio >= 2020
GROUP BY exercicio, bimestre;  

-- ✅ Pré-computar em job noturno (Python worker)
-- API apenas lê tabela agregada (< 10ms)
SELECT * FROM agg_estatisticas_regiao
WHERE regiao = 'Sudeste' AND exercicio = 2024;
```

### 3. Estrutura de Tabelas: 4 Camadas

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: raw_* (Dados Brutos)                       │
│ • JSONB direto da API                               │
│ • Imutável, append-only                             │
│ • Retenção: 90 dias                                 │
└─────────────────────────────────────────────────────┘
              ↓ ETL Pipeline (Python)
┌─────────────────────────────────────────────────────┐
│ Layer 2: stg_* (Staging - Normalizado)             │
│ • Dados validados (Pydantic)                        │
│ • Normalização, deduplicação                        │
│ • Constraints, foreign keys                         │
└─────────────────────────────────────────────────────┘
              ↓ Data Modeling
┌─────────────────────────────────────────────────────┐
│ Layer 3: fct_* + dim_* (Star Schema)               │
│ • Fatos: indicadores, métricas, eventos             │
│ • Dimensões: tempo, município, categoria            │
│ • Queries analíticas otimizadas                     │
└─────────────────────────────────────────────────────┘
              ↓ Agregação (Python CRON)
┌─────────────────────────────────────────────────────┐
│ Layer 4: agg_* + mv_* (Agregados/Views)            │
│ • Pré-computado para consumo rápido                 │
│ • Materialized views (refresh agendado)             │
│ • API pública LÊ APENAS DAQUI                       │
└─────────────────────────────────────────────────────┘
```

**Exemplo Completo:**
```sql
-- Layer 1: Raw (imutável)
CREATE TABLE raw_siconfi_rreo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_ibge TEXT NOT NULL,
  exercicio INTEGER NOT NULL,
  payload JSONB NOT NULL,  -- JSON completo da API
  data_coleta TIMESTAMPTZ DEFAULT NOW(),
  fonte TEXT NOT NULL,
  
  -- Particionamento por ano
  PARTITION BY RANGE (exercicio)
);

-- Layer 2: Staging (normalizado)
CREATE TABLE stg_indicadores_fiscais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_ibge TEXT NOT NULL,
  exercicio INTEGER NOT NULL,
  bimestre INTEGER CHECK (bimestre BETWEEN 1 AND 6),
  rcl DECIMAL(15,2) NOT NULL CHECK (rcl > 0),
  despesa_pessoal DECIMAL(15,2) NOT NULL CHECK (despesa_pessoal >= 0),
  data_processamento TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(codigo_ibge, exercicio, bimestre)
);

-- Layer 3: Fato + Dimensão (star schema)
CREATE TABLE fct_indicadores_fiscais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_ibge TEXT REFERENCES dim_municipio(codigo_ibge),
  dim_tempo_id INTEGER REFERENCES dim_tempo(id),
  rcl DECIMAL(15,2),
  despesa_pessoal DECIMAL(15,2),
  percentual_dp_rcl DECIMAL(5,2),
  status_lrf TEXT CHECK (status_lrf IN ('regular', 'alerta', 'critico')),
  
  -- Índices para queries comuns
  INDEX idx_fct_municipio (codigo_ibge, dim_tempo_id DESC),
  INDEX idx_fct_status (status_lrf, dim_tempo_id DESC)
);

CREATE TABLE dim_tempo (
  id SERIAL PRIMARY KEY,
  exercicio INTEGER NOT NULL,
  bimestre INTEGER,
  ano INTEGER,
  trimestre INTEGER,
  semestre INTEGER,
  UNIQUE(exercicio, bimestre)
);

CREATE TABLE dim_municipio (
  codigo_ibge TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  regiao TEXT,
  populacao INTEGER,
  location GEOGRAPHY(POINT, 4326),  -- PostGIS
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layer 4: Agregados (leitura rápida)
CREATE TABLE agg_estatisticas_regiao (
  regiao TEXT,
  exercicio INTEGER,
  bimestre INTEGER,
  
  -- Estatísticas pré-computadas
  media_rcl DECIMAL(15,2),
  media_dp_percentual DECIMAL(5,2),
  desvio_padrao DECIMAL(5,2),
  percentil_25 DECIMAL(5,2),
  percentil_50 DECIMAL(5,2),
  percentil_75 DECIMAL(5,2),
  total_municipios INTEGER,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (regiao, exercicio, bimestre)
);

-- Materialized View (refresh diário via CRON)
CREATE MATERIALIZED VIEW mv_indicadores_latest AS
SELECT DISTINCT ON (codigo_ibge)
  codigo_ibge,
  exercicio,
  bimestre,
  rcl,
  despesa_pessoal,
  percentual_dp_rcl,
  status_lrf
FROM fct_indicadores_fiscais
ORDER BY codigo_ibge, exercicio DESC, bimestre DESC;

CREATE UNIQUE INDEX ON mv_indicadores_latest(codigo_ibge);

-- Python CRON (todo dia 2h)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicadores_latest;
```

### 4. Pré-Compute Tudo Que For Possível

```sql
-- ❌ NUNCA calcular ao vivo na API
SELECT 
  AVG(percentual_dp_rcl) as media,
  STDDEV(percentual_dp_rcl) as desvio
FROM indicadores_fiscais
WHERE regiao = 'Sudeste'
GROUP BY exercicio;  -- Milhões de linhas, lento!

-- ✅ Pré-computar em job noturno
CREATE TABLE agg_estatisticas_regiao (
  regiao TEXT,
  exercicio INTEGER,
  media_dp_rcl DECIMAL(5,2),
  desvio_dp_rcl DECIMAL(5,2),
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (regiao, exercicio)
);

-- Job CRON popula essa tabela
-- API apenas lê (rápido!)
```

### 2. Tudo > 300-800ms = Assíncrono

```typescript
// ❌ NUNCA fazer síncrono se demorar
app.get('/calcular-tendencias', async (req, res) => {
  const result = await heavyCalculation();  // 5 segundos ❌
  res.json(result);
});

// ✅ Usar fila
app.post('/calcular-tendencias', async (req, res) => {
  const job = await queue.add('tendencias', req.body);
  res.json({ jobId: job.id, statusUrl: `/jobs/${job.id}` });
});
```

### 3. Estrutura de Tabelas: Raw → Staging → Fato → Agregada

```
raw_*        → Dados brutos da API (JSONB)
stg_*        → Normalizado e validado
fct_*        → Star schema (dimensional)
agg_*        → Pré-computado para consumo rápido
mv_*         → Materialized views (refresh agendado)
```

### 5. CRON Centralizado (OBRIGATÓRIO)

```python
# ❌ NUNCA espalhar CRON em todo lugar
# crontab no servidor 1, 2, 3... = caos

# ✅ Scheduler centralizado (Python)
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler(timezone='America/Sao_Paulo')

# Job 1: Importação diária SICONFI (2h da manhã)
@scheduler.scheduled_job(CronTrigger(hour=2, minute=0))
async def import_siconfi_daily():
    """
    Importa RREO de todos os municípios ativos.
    
    Execução: Todo dia 2h
    Duração: ~45min (5570 municípios)
    """
    municipios = await get_active_municipios()
    
    # Publica jobs na fila (não processa síncrono)
    for codigo_ibge in municipios:
        await queue.add('import_siconfi', {
            'codigo_ibge': codigo_ibge,
            'exercicio': datetime.now().year,
            'prioridade': 'normal'
        })
    
    logger.info(f"Agendado import para {len(municipios)} municípios")

# Job 2: Refresh de Materialized Views (3h da manhã)
@scheduler.scheduled_job(CronTrigger(hour=3, minute=0))
async def refresh_materialized_views():
    """
    Atualiza todas as materialized views.
    
    Execução: Todo dia 3h
    Duração: ~10min
    """
    await db.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicadores_latest")
    await db.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tendencias_regiao")
    await db.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_comparacoes_peers")

# Job 3: Cálculo de tendências (domingo 4h)
@scheduler.scheduled_job(CronTrigger(day_of_week='sun', hour=4))
async def calculate_trends_weekly():
    """
    Calcula tendências históricas (últimos 24 meses).
    
    Execução: Todo domingo 4h
    Duração: ~2h (processamento pesado)
    """
    municipios = await get_all_municipios()
    
    for codigo_ibge in municipios:
        await queue.add('calculate_trends', {
            'codigo_ibge': codigo_ibge,
            'periods': 24,
            'prioridade': 'baixa'
        })

# Job 4: Limpeza de dados antigos (1º dia do mês, 1h)
@scheduler.scheduled_job(CronTrigger(day=1, hour=1))
async def cleanup_old_data():
    """
    Remove dados raw > 90 dias.
    
    Execução: 1º dia do mês, 1h
    """
    cutoff_date = datetime.now() - timedelta(days=90)
    
    deleted = await db.execute("""
        DELETE FROM raw_siconfi_rreo
        WHERE data_coleta < $1
    """, cutoff_date)
    
    logger.info(f"Removidos {deleted} registros antigos")

# Job 5: Backup incremental (todo dia 5h)
@scheduler.scheduled_job(CronTrigger(hour=5, minute=0))
async def backup_incremental():
    """
    Backup incremental do banco.
    """
    await run_backup_command()

# Inicia scheduler
scheduler.start()
```

### 6. Índices Inteligentes (CRÍTICO)

```sql
-- ✅ Índice composto para queries comuns
CREATE INDEX idx_indicadores_lookup 
ON fct_indicadores_fiscais(codigo_ibge, exercicio DESC);

-- ✅ Partial index (apenas dados recentes = menor, mais rápido)
CREATE INDEX idx_indicadores_recent 
ON fct_indicadores_fiscais(codigo_ibge, exercicio) 
WHERE exercicio >= 2020;

-- ✅ Index-only scan (covering index)
CREATE INDEX idx_indicadores_status_covering 
ON fct_indicadores_fiscais(codigo_ibge, exercicio, status_lrf)
INCLUDE (percentual_dp_rcl);

-- ✅ GiST para geo queries (PostGIS)
CREATE INDEX idx_municipios_location 
ON dim_municipio USING GIST(location);

-- ✅ HNSW para vector search (pgvector)
CREATE INDEX idx_embeddings_vector 
ON embeddings USING hnsw(embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ✅ GIN para JSONB
CREATE INDEX idx_metadata_gin 
ON embeddings USING GIN(metadata);

-- ✅ B-tree para filtros comuns
CREATE INDEX idx_indicadores_status 
ON fct_indicadores_fiscais(status_lrf, exercicio DESC);

-- ❌ NUNCA criar índice em:
-- - Tabelas pequenas (< 1000 linhas)
-- - Colunas com baixa cardinalidade e sem filtro (ex: boolean sem WHERE)
-- - Colunas que mudam muito (alto write churn)
```

---

```sql
-- Índice composto para queries comuns
CREATE INDEX idx_indicadores_lookup 
ON fct_indicadores_fiscais(codigo_ibge, exercicio DESC);

-- Partial index (apenas dados recentes)
CREATE INDEX idx_indicadores_recent 
ON fct_indicadores_fiscais(codigo_ibge) 
WHERE exercicio >= 2020;

-- GiST para geo queries
CREATE INDEX idx_municipios_location 
ON dim_municipio USING GIST(location);

-- HNSW para vector search
CREATE INDEX idx_embeddings_vector 
ON embeddings USING hnsw(embedding vector_cosine_ops);
```

---

## 🔐 SEGURANÇA & COMPLIANCE (ISO 27001/27701)

### Logging Estruturado

```typescript
// Winston + request_id
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/api.log',
      maxsize: 10485760,  // 10MB
      maxFiles: 30
    })
  ]
});

// Middleware de logging
app.use((req, res, next) => {
  req.id = uuidv4();  // request_id único
  
  logger.info('incoming_request', {
    request_id: req.id,
    method: req.method,
    url: req.url,
    user_id: req.user?.id,
    tenant_id: req.tenant?.id,
    ip: req.ip,
    user_agent: req.get('user-agent')
  });
  
  next();
});
```

### Auditoria

```sql
-- Tabela de auditoria
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Quem
  user_id UUID,
  tenant_id UUID,
  
  -- O quê
  action TEXT NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'READ'
  resource_type TEXT NOT NULL,
  resource_id UUID,
  
  -- Como
  changes JSONB,  -- before/after
  
  -- Quando/Onde
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  
  -- Metadados
  metadata JSONB
);

-- Índices
CREATE INDEX idx_audit_user ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
```

---

## 🎤 GESTÃO DE VOZ (CRÍTICO)

### Configuração OpenAI TTS (gpt-4o-mini-tts)

**Localização:** `src/config/voice-config.ts` (iconsai-production)

```typescript
// SEMPRE usar estes presets conforme módulo
export const VOICE_PRESETS = {
  friendly_assistant: {
    model: 'gpt-4o-mini-tts',
    voice: 'marin',
    speed: 1.0,
    instructions: `
      Voice Affect: Warm, friendly, naturally conversational.
      Tone: Approachable, like a knowledgeable friend.
      Language: Brazilian Portuguese with natural intonation.
      Avoid: Robotic monotone, rushed speech.
    `
  },
  calm_health: {
    voice: 'cedar',
    speed: 0.95,
    instructions: `
      Voice Affect: Calm, reassuring, empathetic.
      Tone: Professional yet warm healthcare provider.
      Language: Brazilian Portuguese.
    `
  },
  creative_ideas: {
    voice: 'nova',
    speed: 1.05,
    instructions: `
      Voice Affect: Energetic, inspiring, creative.
      Tone: Enthusiastic, sparking excitement.
    `
  }
};
```

### Parâmetros ElevenLabs (quando usado)

```json
{
  "stability": 0.45,
  "similarity_boost": 0.75,
  "style_exaggeration": 0.15,
  "speed": 1.0,
  "use_speaker_boost": true
}
```

### Vozes OpenAI Recomendadas

| Módulo | Voz | Características |
|--------|-----|-----------------|
| Home/Help | `marin` | Calorosa, natural |
| Saúde | `cedar` | Calma, reconfortante |
| Ideias | `nova` | Energética, engajada |
| Mundo/Info | `sage` | Sábia, educativa |

---

## 📊 RASTREAMENTO DE FONTES DE DADOS

### Estrutura da Tabela (OBRIGATÓRIA em todos os projetos)

```sql
CREATE TABLE fontes_dados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificação
  nome TEXT NOT NULL,                  -- Ex: "SICONFI - RREO"
  categoria TEXT NOT NULL,             -- Ex: "fiscal", "geografico", "economico"
  
  -- Origem
  fonte_primaria TEXT NOT NULL,        -- Ex: "Tesouro Nacional"
  url TEXT NOT NULL,                   -- URL da API/fonte
  documentacao_url TEXT,               -- URL da documentação
  
  -- Rastreamento
  data_primeira_coleta TIMESTAMPTZ NOT NULL,
  data_ultima_atualizacao TIMESTAMPTZ,
  periodicidade TEXT,                  -- "mensal", "bimestral", "anual"
  
  -- Metadados
  formato TEXT,                        -- "JSON", "CSV", "XML"
  autenticacao_requerida BOOLEAN DEFAULT false,
  api_key_necessaria BOOLEAN DEFAULT false,
  
  -- Qualidade
  confiabilidade TEXT,                 -- "alta", "media", "baixa"
  cobertura_temporal TEXT,             -- Ex: "2015-presente"
  observacoes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_fontes_categoria ON fontes_dados(categoria);
CREATE INDEX idx_fontes_periodicidade ON fontes_dados(periodicidade);
```

### Exemplo de Registro

```sql
INSERT INTO fontes_dados (
  nome,
  categoria,
  fonte_primaria,
  url,
  documentacao_url,
  data_primeira_coleta,
  periodicidade,
  formato,
  confiabilidade,
  cobertura_temporal
) VALUES (
  'SICONFI - Relatório Resumido Execução Orçamentária',
  'fiscal',
  'Tesouro Nacional',
  'https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo',
  'https://siconfi.tesouro.gov.br/siconfi/pages/public/consulta_finbra/finbra_list.jsf',
  '2026-01-15',
  'bimestral',
  'JSON',
  'alta',
  '2015-presente'
);
```

---

## 🔧 COMANDOS PRINCIPAIS

### iconsai-production
```bash
npm run dev              # Dev local
npm run build            # Build produção
npm run lint             # ESLint check
npm run preview          # Preview build
npm run validate         # lint + pre-deploy + build
```

### orcamento-fiscal-municipios
```bash
npm run dev              # Frontend dev
npm run build            # TypeScript compile + Vite build
npm run lint             # ESLint check

# Python scripts (backend)
python scripts/siconfi_rreo_import.py          # Importar RREO
python scripts/popular_indicadores_fiscais.py  # Calcular indicadores
python scripts/aplicar_migration_*.py          # Migrations
```

### scraping-hub
```bash
# Backend Python
uvicorn api.main:app --reload     # Dev local
pytest                            # Run tests
pytest --cov                      # Com coverage

# Frontend (se houver)
cd frontend && npm run dev
```

---

## 🏗️ PADRÕES DE CÓDIGO

### TypeScript (Frontend)

```typescript
// ✅ DO: Type safety completo
interface FiscalIndicator {
  codigo_ibge: string;
  rcl: number;
  despesa_pessoal: number;
  percentual_dp_rcl: number;
  status_lrf: 'regular' | 'alerta' | 'critico';
}

// ✅ DO: Validação com Zod
import { z } from 'zod';

const FiscalIndicatorSchema = z.object({
  codigo_ibge: z.string().regex(/^\d{7}$/),
  rcl: z.number().positive(),
  despesa_pessoal: z.number().nonnegative(),
  percentual_dp_rcl: z.number().min(0).max(100),
  status_lrf: z.enum(['regular', 'alerta', 'critico'])
});

// ✅ DO: Async/await para I/O
async function fetchIndicators(codigoIbge: string): Promise<FiscalIndicator> {
  const { data, error } = await supabase
    .from('indicadores_fiscais')
    .select('*')
    .eq('codigo_ibge', codigoIbge)
    .single();
  
  if (error) throw new AppError(error.message, 500);
  return FiscalIndicatorSchema.parse(data);
}

// ❌ DON'T: Cálculos complexos no frontend
const percentual = (despesa / rcl) * 100; // ❌ Fazer no backend Python

// ✅ DO: Chamar endpoint que calcula
const { percentual } = await api.calcularPercentualDpRcl(codigoIbge);
```

### Python (Backend)

```python
# ✅ DO: Type hints obrigatórios
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class FiscalIndicator(BaseModel):
    codigo_ibge: str = Field(..., regex=r'^\d{7}$')
    rcl: float = Field(..., gt=0)
    despesa_pessoal: float = Field(..., ge=0)
    percentual_dp_rcl: float = Field(..., ge=0, le=100)
    status_lrf: Literal['regular', 'alerta', 'critico']
    
    class Config:
        frozen = True  # Imutável

# ✅ DO: Async para I/O
async def fetch_indicators(codigo_ibge: str) -> FiscalIndicator:
    """
    Busca indicadores fiscais de um município.
    
    Args:
        codigo_ibge: Código IBGE de 7 dígitos
        
    Returns:
        FiscalIndicator com dados validados
        
    Raises:
        ValueError: Se código IBGE inválido
        HTTPException: Se município não encontrado
    """
    query = "SELECT * FROM indicadores_fiscais WHERE codigo_ibge = $1"
    row = await db.fetchrow(query, codigo_ibge)
    
    if not row:
        raise HTTPException(404, "Município não encontrado")
    
    return FiscalIndicator(**dict(row))

# ✅ DO: Cálculos complexos em Python
def calcular_percentual_dp_rcl(
    despesa_pessoal: float,
    rcl: float,
    aplicar_limite_prudencial: bool = False
) -> float:
    """
    Calcula percentual de Despesa com Pessoal sobre RCL.
    
    Conforme LRF (Lei Complementar 101/2000):
    - Limite total: 60% RCL (município)
    - Limite prudencial: 57% RCL (95% do limite)
    - Limite de alerta: 54% RCL (90% do limite)
    
    Args:
        despesa_pessoal: Total da despesa com pessoal
        rcl: Receita Corrente Líquida
        aplicar_limite_prudencial: Se deve usar limite prudencial
        
    Returns:
        Percentual calculado (0-100)
    """
    if rcl <= 0:
        raise ValueError("RCL deve ser positiva")
    
    percentual = (despesa_pessoal / rcl) * 100
    
    # Arredondar para 2 casas decimais
    return round(percentual, 2)

# ❌ DON'T: SQL direto
result = db.execute(f"SELECT * FROM users WHERE id = {user_id}")  # SQL Injection!

# ✅ DO: Prepared statements
result = await db.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
```

---

## 🧪 TESTES

### Frontend (Vitest)

```typescript
// src/__tests__/calculos.test.ts
import { describe, it, expect } from 'vitest';
import { calcularStatus } from '../utils/fiscais';

describe('Cálculos Fiscais', () => {
  it('deve classificar como regular quando < 90%', () => {
    const status = calcularStatus(45.5); // 45.5% de DP/RCL
    expect(status).toBe('regular');
  });
  
  it('deve classificar como alerta quando >= 90% e < 95%', () => {
    const status = calcularStatus(91.2);
    expect(status).toBe('alerta');
  });
  
  it('deve classificar como crítico quando >= 95%', () => {
    const status = calcularStatus(97.8);
    expect(status).toBe('critico');
  });
});
```

### Backend (pytest)

```python
# tests/test_fiscal_calculations.py
import pytest
from decimal import Decimal
from services.fiscal import calcular_percentual_dp_rcl

def test_calculo_percentual_dp_rcl_basico():
    """Testa cálculo básico do percentual DP/RCL"""
    percentual = calcular_percentual_dp_rcl(
        despesa_pessoal=100_000,
        rcl=200_000
    )
    assert percentual == 50.0

def test_calculo_com_rcl_zero_deve_falhar():
    """Testa que RCL zero levanta ValueError"""
    with pytest.raises(ValueError, match="RCL deve ser positiva"):
        calcular_percentual_dp_rcl(
            despesa_pessoal=100_000,
            rcl=0
        )

@pytest.mark.asyncio
async def test_fetch_indicators_municipio_inexistente():
    """Testa busca de município inexistente"""
    with pytest.raises(HTTPException) as exc_info:
        await fetch_indicators("9999999")
    
    assert exc_info.value.status_code == 404
```

---

## 📚 DOCUMENTAÇÃO ESSENCIAL

### Locais de Documentação por Projeto

#### orcamento-fiscal-municipios
- `docs/FONTES_DADOS.md` → Todas as fontes de dados usadas
- `docs/VOICE_HUMANIZATION_GUIDE.md` → Guia completo de TTS
- `docs/AUDITORIA_*.md` → Auditorias do sistema
- `docs/api-contracts/` → Contratos de API

#### iconsai-production
- `docs/PWA_SPECIFICATION.md` → Especificação do PWA
- `docs/PRE-DEPLOY-CHECKLIST.md` → Checklist antes de deploy

#### scraping-hub
- `README.md` → Setup e configuração
- `tests/` → Exemplos de uso

---

## 🚀 WORKFLOW DE DESENVOLVIMENTO

### 1. Entendimento do Requisito
```markdown
Antes de QUALQUER código:

1. ✅ Ler o requisito completamente
2. ✅ Criar questionário de validação:
   - O que foi compreendido?
   - Quais componentes serão afetados?
   - Existem cálculos envolvidos? (Backend!)
   - Precisa TTS? (Qual módulo?)
   - Fontes de dados? (Registrar!)
3. ✅ Aguardar confirmação do usuário
4. ✅ SÓ ENTÃO começar a implementar
```

### 2. Implementação
```markdown
Durante implementação:

1. ✅ Seguir EXATAMENTE o que foi pedido
2. ✅ NÃO mudar código não relacionado
3. ✅ Cálculos matemáticos → Python backend
4. ✅ Dados → vir de API/DB, NUNCA hardcode
5. ✅ TTS → usar presets, nunca browser voice
6. ✅ Registrar fontes de dados
```

### 3. Validação
```markdown
Antes de entregar:

1. ✅ Código compila/roda?
2. ✅ Testes passam?
3. ✅ Lint OK?
4. ✅ Fontes registradas?
5. ✅ TTS configurado (se aplicável)?
6. ✅ Documentação atualizada?
```

---

## 🔐 SEGURANÇA

### Variáveis de Ambiente

```bash
# NUNCA commitar secrets
# SEMPRE usar .env e .env.example

# .env (gitignored)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
OPENAI_API_KEY=sk-xxx
ELEVENLABS_API_KEY=xxx
DATABASE_URL=postgresql://xxx

# .env.example (versionado)
SUPABASE_URL=
SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
DATABASE_URL=
```

### Input Validation

```typescript
// ✅ SEMPRE validar input do usuário
import { z } from 'zod';

const UserInputSchema = z.object({
  codigoIbge: z.string().regex(/^\d{7}$/, 'Código IBGE inválido'),
  exercicio: z.number().int().min(2015).max(new Date().getFullYear())
});

async function handleUserInput(input: unknown) {
  try {
    const validated = UserInputSchema.parse(input);
    // Usar validated, não input diretamente
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors);
    }
  }
}
```

---

## 📖 GLOSSÁRIO FISCAL (orcamento-fiscal)

- **RCL**: Receita Corrente Líquida
- **DP**: Despesa com Pessoal
- **LRF**: Lei de Responsabilidade Fiscal (LC 101/2000)
- **RREO**: Relatório Resumido da Execução Orçamentária
- **RGF**: Relatório de Gestão Fiscal
- **DCA**: Demonstrativo das Contas Anuais
- **SICONFI**: Sistema de Informações Contábeis e Fiscais
- **IBGE**: Instituto Brasileiro de Geografia e Estatística
- **Limite Prudencial**: 95% do limite total (57% para municípios)
- **Limite de Alerta**: 90% do limite total (54% para municípios)

---

## ⚠️ PROBLEMAS CONHECIDOS

### scraping-hub (PROBLEMÁTICO)
- Quebra frequente de scrapers (sites mudam)
- Falta de retry logic robusto
- Logs insuficientes para debug
- Necessita refactoring em services/

### iconsai-production
- Múltiplos módulos com lógica duplicada
- Necessita consolidação de componentes
- Performance de renderização em listas grandes

### orcamento-fiscal-municipios
- ETL massivo pode ser lento (5000+ municípios)
- Necessita cache em queries complexas
- Migrations manuais ainda necessárias

---

## 🎓 APRENDIZADO CONTÍNUO

### Após cada erro/correção:
```markdown
1. ✅ Documentar o que deu errado
2. ✅ Atualizar este CLAUDE.md com:
   - ❌ DON'T: [O que não fazer]
   - ✅ DO: [Como fazer certo]
3. ✅ Adicionar regra crítica se for caso grave
```

---

## 📞 QUANDO EM DÚVIDA

**REGRA DE OURO**: Na dúvida, PERGUNTE.

Nunca é melhor "tentar adivinhar" do que perguntar e fazer certo.

---

## 🛡️ REGRAS DE QUALIDADE E SEGURANÇA (v3.0 - 11/02/2026)

### VALIDAÇÃO OBRIGATÓRIA

**Node.js - Usar Zod:**
```javascript
import { z } from 'zod';

const schema = z.object({
  nome: z.string().min(2).max(200),
  email: z.string().email()
});

// Validar antes de processar
const validated = schema.parse(req.body);
```

**Python - Usar Pydantic:**
```python
from pydantic import BaseModel

class RequestBody(BaseModel):
    nome: str
    email: str
```

### CONSTANTES (SEM MAGIC STRINGS)

```javascript
// ❌ PROIBIDO
status = 'ATIVO';

// ✅ OBRIGATÓRIO
import { STATUS } from './constants.js';
status = STATUS.ATIVO;
```

### LOGGING ESTRUTURADO

```javascript
// ❌ PROIBIDO
console.log('Erro:', error);

// ✅ OBRIGATÓRIO
logger.error('Operação falhou', { error: error.message, context: {} });
```

### RATE LIMITER (APIs Públicas)

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuto
  max: 100              // 100 req/IP
});

app.use('/api', limiter);
```

### REGISTRO DE FONTES DE DADOS (COMPLIANCE)

Todo scraping/API externa deve registrar fonte:
- Nome da fonte
- URL
- Categoria
- Confiabilidade
- Data de coleta

### DEPLOY VIA CI/CD

```
❌ NUNCA SSH no servidor para deploy
❌ NUNCA editar arquivos diretamente no servidor

✅ SEMPRE commit + push → GitHub Actions
✅ SEMPRE secrets via GitHub Secrets
```

---

**Última atualização:** 08/02/2026
**Versão:** 1.0.0
**Mantenedor:** Fernando (fernando@iconsai.dev)
