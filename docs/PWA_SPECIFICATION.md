# PWA KnowYOU - ESPECIFICACAO COMPLETA

## ARQUITETURA DE INFRAESTRUTURA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITETURA PWA KNOWYOU                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   CURSOR    │    │ DIGITALOCEAN│    │  SUPABASE   │    │   VERCEL    │  │
│  │    (IDE)    │◄──►│   (Codigo)  │◄──►│    (BD)     │    │  (Deploy)   │  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘    └─────────────┘  │
│                            │                                                │
│                            ▼                                                │
│                     ┌─────────────┐                                         │
│                     │     N8N     │                                         │
│                     │(Orquestrador)│                                        │
│                     └─────────────┘                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Regras de Infraestrutura (OBRIGATORIO)

1. **CODIGO** - DigitalOcean com acesso pelo Cursor
2. **BANCO DE DADOS** - Supabase (projeto PWA separado)
3. **ORQUESTRADOR** - N8N (cadastro, convite, fluxo de execucao)
4. **DEPLOY** - Vercel
5. **NADA NO LOVABLE** - Todo codigo extraido do knowyou-production

---

## ESPECIFICACAO DAS TELAS

### 1. HOME

```
┌────────────────────────────────────────┐
│              KnowYOU                   │  ← Titulo distante do header
│                                        │
│                                        │
│         ╭──────────────────╮           │
│         │   ◯ ANEL EXTERNO │           │  ← Anel escuro envolvendo
│         │  ╭────────────╮  │           │
│         │  │  ▶ BOTAO   │  │           │  ← Botao ciano com play
│         │  │   (LOAD)   │  │           │     Efeito luminosidade rodando
│         │  ╰────────────╯  │           │     Centro: imagem de load
│         ╰──────────────────╯           │
│                                        │
│     ═══════════════════════════        │  ← Voice Spectrum DIFERENTE
│     ═══════ LINHA CENTRO ═════         │     Barras expandem CIMA e BAIXO
│     ═══════════════════════════        │
│                                        │
│   ┌─────────┐        ┌─────────┐       │
│   │  Ajuda  │        │  Mundo  │       │  ← Modulos DESABILITADOS
│   │ (cinza) │        │ (cinza) │       │     durante autoplay
│   └─────────┘        └─────────┘       │
│   ┌─────────┐        ┌─────────┐       │
│   │  Saude  │        │  Ideias │       │
│   │ (cinza) │        │ (cinza) │       │
│   └─────────┘        └─────────┘       │
│                                        │
│         (espaco para footer)           │  ← Modulos distantes do footer
└────────────────────────────────────────┘
```

#### Microservicos da HOME

| Microservico | Descricao | Diferente dos Modulos? |
|--------------|-----------|------------------------|
| **PlayButton** | Botao com anel externo escuro + botao ciano interno | SIM - Design exclusivo |
| **VoiceSpectrum** | Barras horizontais expandem CIMA e BAIXO a partir da linha central | SIM - Design exclusivo |
| **ModuleSelector** | Grid 2x2 com modulos (Ajuda, Mundo, Saude, Ideias) | SIM - Design exclusivo |
| **Autoplay** | Toca boas-vindas obrigatoriamente | Igual |
| **Historico** | NAO TEM na Home | NAO EXISTE |
| **Microfone** | NAO TEM na Home | NAO EXISTE |

#### Fluxo da HOME (OBRIGATORIO)

```
1. Abriu a pagina
      ↓
2. Carrega Home COM MODULOS DESABILITADOS
      ↓
3. Efeito de luminosidade rodando no botao (load)
      ↓
4. Centro do botao: imagem de load
      ↓
5. AUTOPLAY OBRIGATORIO (Safari/Chrome - NAO IMPORTA)
      ↓
6. Voice Spectrum anima (barras cima/baixo)
      ↓
7. AO FINAL DA FALA → MODULOS HABILITADOS
```

---

### 2. MODULOS (Help, World, Health, Ideas)

```
┌────────────────────────────────────────┐
│  ←  [Icon]  Titulo      [Historico]●   │  ← Header com historico
│                                        │     Ponto vermelho piscando
│                                        │     com efeito wave
│                                        │
│     ═══════════════════════════        │
│     ════ VOICE SPECTRUM ═══════        │  ← Spectrum ATUAL (acima botao)
│     ═══════════════════════════        │
│                                        │
│            ╭────────────╮              │
│            │  ▶ BOTAO   │              │  ← Botao ATUAL (pulsa)
│            │   ATUAL    │              │
│            ╰────────────╯              │
│                                        │
│            ╭────────────╮              │
│            │     🎤     │              │  ← Microfone DESABILITADO
│            │ (disabled) │              │     durante autoplay
│            ╰────────────╯              │
│                                        │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐       │
│  │ ●  │  │ ●  │  │ 🏠 │  │ ●  │       │  ← Footer com icones
│  │Ajuda│  │Mundo│  │Home│  │Saude│     │     Bolinha piscando na cor
│  └────┘  └────┘  └────┘  └────┘       │     do modulo + efeito wave
└────────────────────────────────────────┘
```

#### Microservicos dos MODULOS

| Microservico | Descricao | Igual a HOME? |
|--------------|-----------|---------------|
| **PlayButton** | Botao ATUAL (sem anel externo) - pulsa quando acessado | NAO - Design diferente |
| **VoiceSpectrum** | Spectrum ATUAL (barras verticais simples) | NAO - Design diferente |
| **ModuleBoxes** | Caixas dos modulos COMO ESTAO HOJE | NAO - Design diferente |
| **Historico** | Botao com ponto vermelho piscando + wave | EXCLUSIVO |
| **Microfone** | Botao microfone (desabilitado durante autoplay) | EXCLUSIVO |
| **FooterIcons** | Icones inferiores com bolinha colorida piscando + wave | EXCLUSIVO |

#### Fluxo dos MODULOS (OBRIGATORIO)

```
1. Abriu a pagina do modulo
      ↓
2. Carrega modulo COM ICONES E MICROFONE DESABILITADOS
      ↓
3. Botao pulsa
      ↓
4. AUTOPLAY OBRIGATORIO (Safari/Chrome - NAO IMPORTA)
      ↓
5. Voice Spectrum anima
      ↓
6. AO FINAL DA FALA → ICONES E MICROFONE HABILITADOS
```

---

## CONFIGURACAO DE VOZ (CONFIG VOZ)

### Regras OBRIGATORIAS

1. **TODAS as vozes** devem obedecer as configuracoes do Config Voz
2. **NENHUMA voz aleatoria** - NAO ACEITO
3. **Textos de boas-vindas** configurados APENAS no Config Voz
4. **HIGIENIZAR** toda fala que nao esteja em Configuracoes > Boas Vindas

### Fluxo de Resposta ao Microfone

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE RESPOSTA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Usuario fala no microfone                                   │
│           ↓                                                     │
│  2. Transcreve audio → texto                                    │
│           ↓                                                     │
│  3. Busca resposta em:                                          │
│           │                                                     │
│           ├── [1] BASE DE RAG (prioridade)                      │
│           │                                                     │
│           ├── [2] Se nao encontrado → SCRAPING NO X             │
│           │       (via N8N - ver video referencia)              │
│           │                                                     │
│           └── [3] Fallback: resposta padrao                     │
│           ↓                                                     │
│  4. Resposta falada usando Config Voz                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## FONTES DE DADOS PARA SCRAPING (X/Twitter)

### MODULO MUNDO

#### IA, Ciencia & Tecnologia
- @Reuters - Base factual
- @techreview - MIT Technology Review
- @nature - Nature
- @ScienceMagazine - Science Magazine
- @arxiv - arXiv

#### IA, Dados & Pesquisa
- @OpenAI
- @GoogleDeepMind
- @StanfordHAI
- @AINowInstitute

#### Economia & Geopolitica
- @FT - Financial Times
- @TheEconomist
- @wef - World Economic Forum
- @OECD

#### Brasil
- @agenciabrasil
- @valoreconomico
- @ibgecomunica

#### Pessoas (academico/tecnico)
- @demishassabis
- @AndrewYNg
- @GaryMarcus

### MODULO SAUDE

#### Portais Cientificos
- WHO - https://www.who.int/
- CID-11 - https://icd.who.int/en
- PubMed - https://pubmed.ncbi.nlm.nih.gov/
- Cochrane - https://www.cochranelibrary.com/
- NIH - https://www.nih.gov/

#### Saude Mental/Clinica
- The Lancet - https://www.thelancet.com/
- Nature Medicine - https://www.nature.com/nm/

### MODULO IDEIAS

#### Inovacao & Empreendedorismo
- OECD Oslo Manual - https://www.oecd.org/innovation/
- GEM - https://www.gemconsortium.org/
- Y Combinator - https://www.ycombinator.com/library
- SBA - https://www.sba.gov/business-guide

---

## ARQUITETURA DE MICROSERVICOS

```
src/components/pwa/
├── containers/
│   ├── HomeContainer.tsx          (Container HOME - design exclusivo)
│   ├── HelpModuleContainer.tsx    (Container Ajuda)
│   ├── HealthModuleContainer.tsx  (Container Saude)
│   ├── WorldModuleContainer.tsx   (Container Mundo)
│   └── IdeasModuleContainer.tsx   (Container Ideias)
│
├── microservices/
│   ├── home/
│   │   ├── HomePlayButton.tsx     (Botao exclusivo HOME - anel externo)
│   │   ├── HomeVoiceSpectrum.tsx  (Spectrum exclusivo - cima/baixo)
│   │   └── HomeModuleSelector.tsx (Seletor modulos - design exclusivo)
│   │
│   ├── modules/
│   │   ├── ModulePlayButton.tsx   (Botao modulos - design atual)
│   │   ├── ModuleVoiceSpectrum.tsx(Spectrum modulos - design atual)
│   │   ├── ModuleMicrophone.tsx   (Microfone)
│   │   ├── ModuleHistory.tsx      (Historico com wave vermelho)
│   │   └── ModuleFooter.tsx       (Footer com icones piscando)
│   │
│   └── shared/
│       ├── AudioManager.tsx       (Gerenciador de audio)
│       ├── AutoplayManager.tsx    (Autoplay obrigatorio)
│       └── VoiceConfig.tsx        (Configuracoes de voz)
│
└── voice/
    └── PWAVoiceAssistant.tsx      (Orquestrador principal)
```

---

## BANCO DE DADOS SUPABASE (Projeto PWA)

### Tabelas Necessarias

```sql
-- Configuracoes de voz
CREATE TABLE pwa_config (
    config_key VARCHAR PRIMARY KEY,
    config_value TEXT,
    config_type VARCHAR,
    updated_at TIMESTAMP
);

-- Conversas
CREATE TABLE pwa_conversations (
    id UUID PRIMARY KEY,
    device_id VARCHAR,
    module_type VARCHAR,
    user_message TEXT,
    ai_response TEXT,
    created_at TIMESTAMP
);

-- Base de conhecimento (RAG)
CREATE TABLE pwa_knowledge_base (
    id UUID PRIMARY KEY,
    keywords TEXT[],          -- Palavras-chave que geraram
    content TEXT,
    source VARCHAR,           -- 'x_scraping', 'manual', 'api'
    source_url VARCHAR,
    module_type VARCHAR,
    created_at TIMESTAMP
);

-- Historico de scraping
CREATE TABLE pwa_scraping_log (
    id UUID PRIMARY KEY,
    source VARCHAR,           -- '@Reuters', '@OpenAI', etc
    content TEXT,
    keywords TEXT[],
    scraped_at TIMESTAMP
);
```

---

## PROXIMOS PASSOS

1. [ ] Obter codigo do PlayButton do Lovable (KnowYOU Health AI)
2. [ ] Criar novo repositorio PWA no DigitalOcean
3. [ ] Configurar Supabase (projeto PWA)
4. [ ] Configurar N8N no DigitalOcean
5. [ ] Extrair codigo do knowyou-production
6. [ ] Implementar microservicos exclusivos da HOME
7. [ ] Configurar deploy na Vercel
8. [ ] Implementar scraping do X via N8N
9. [ ] Testar autoplay em Safari/Chrome
10. [ ] Configurar Config Voz centralizado

---

## VIDEO REFERENCIA

- Scraping X/Twitter via N8N: https://youtu.be/Jk4j7VxvSJU?si=ehxV2q6P7vPgIWTY

---

*Documento criado em: 2026-01-16*
*Fonte: Especificacoes do usuario Fernando Arbache*
