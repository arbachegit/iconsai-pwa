# 🏗️ ARQUITETURA E HOSPEDAGEM - KNOWYOU PRODUCTION

**Data:** 17/01/2026
**Autor:** Claude + Fernando
**Status:** ⚠️ ATENÇÃO - Arquitetura complexa com múltiplos Supabase

---

## ⚠️ DESCOBERTA IMPORTANTE: 3 PROJETOS SUPABASE!

Encontrei uma arquitetura complexa com **3 projetos Supabase diferentes**:

| # | Nome | Project ID | Uso Atual | Conexão |
|---|------|------------|-----------|---------|
| **1** | **knowyou-production** (original) | `gmflpmcepempcygdrayv` | Edge Functions deployment | GitHub Actions |
| **2** | **brasil-data-hub** (frontend) | `uhazjwqfsvxqozepyjjj` | Frontend conectado (.env) | Vite app |
| **3** | **brasil-data-hub** (dados públicos) | `mnfjkegtynjtgesfphge` | Dados IBGE/SNIS | DigitalOcean |

---

## 📊 ARQUITETURA ATUAL - DETALHADA

### 1️⃣ PROJETO SUPABASE: `knowyou-production` (gmflpmcepempcygdrayv)

**Localização:** `supabase/config.toml`

```toml
project_id = "gmflpmcepempcygdrayv"
```

**Uso:**
- ✅ Deploy de Edge Functions via GitHub Actions
- ✅ Configurado no workflow: `.github/workflows/deploy-supabase.yml`
- ❓ **NÃO** está conectado ao frontend atualmente

**Edge Functions deployadas aqui:**
- `chat-router`
- `deep-search`
- `generate-image`, `generate-section-image`, `generate-history-image`, `generate-image-study`
- `text-to-speech`, `voice-to-text`
- `classify-and-enrich`
- `send-email`
- `pwacity-openai` ✅ (recém adicionada)
- `pwacity-gemini` ✅ (recém adicionada)

**Deploy automático:**
```yaml
# .github/workflows/deploy-supabase.yml
on:
  push:
    branches: [main]
    paths: ['supabase/functions/**']
```

---

### 2️⃣ PROJETO SUPABASE: `brasil-data-hub` (uhazjwqfsvxqozepyjjj)

**Localização:** `.env`

```env
VITE_SUPABASE_PROJECT_ID="uhazjwqfsvxqozepyjjj"
VITE_SUPABASE_URL="https://uhazjwqfsvxqozepyjjj.supabase.co"
```

**Uso:**
- ✅ **Frontend conectado** via `src/integrations/supabase/client.ts`
- ✅ **Autenticação PWA** (PWA City, PWA Health)
- ✅ **Dados gerados pelo front** (conversas, sessões, configs)
- ✅ **Secrets configuradas aqui** (OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY)

**Tabelas (provavelmente):**
- `pwacity_invites`
- `pwacity_sessions`
- `pwacity_conversations`
- `pwacity_config`
- `pwahealth_*` (tabelas do PWA Health)
- Autenticação de usuários

**⚠️ PROBLEMA IDENTIFICADO:**
- As Edge Functions `pwacity-openai` e `pwacity-gemini` estão sendo deployadas no projeto `gmflpmcepempcygdrayv`
- Mas o frontend está tentando chamar no projeto `uhazjwqfsvxqozepyjjj`
- **Isso pode causar erro 404 nas chamadas das funções!**

---

### 3️⃣ PROJETO SUPABASE: `brasil-data-hub` (mnfjkegtynjtgesfphge)

**Localização:** `src/integrations/brasil-data-hub/client.ts`

```typescript
const BRASIL_DATA_HUB_URL = 'https://mnfjkegtynjtgesfphge.supabase.co';
```

**Uso:**
- ✅ **Serviço de dados públicos brasileiros**
- ✅ Gerenciado pelo **Droplet DigitalOcean** (IP: 64.225.58.182)
- ✅ Cliente separado: `brasilDataHub`

**Dados disponíveis:**
- Geografia IBGE: Regiões, Estados, Municípios
- Saneamento SNIS: Indicadores de água, esgoto
- Saúde DATASUS: Estabelecimentos
- Educação INEP: Escolas

**Hooks React Query:**
- `useRegioes()`, `useEstados()`, `useMunicipios()`
- `useSaneamentoMunicipio()`

---

## 🌐 HOSPEDAGEM DO FRONTEND

### Status Atual: INDEFINIDO ⚠️

**Evidências encontradas:**

1. **Configuração Vercel:**
   - ✅ Arquivo `public/vercel.json` existe
   - ✅ Rewrites configurados para SPA

2. **Lovable:**
   - ✅ Dependência `lovable-tagger` no `package.json`
   - ✅ URL do projeto: https://lovable.dev/projects/db155f46-a23e-47f5-98c7-87d81596f2a8
   - ❓ Mas NÃO tem pasta `.lovable/`

3. **Build:**
   - ✅ Vite como bundler
   - ✅ Scripts: `npm run build` → Vite build
   - ✅ Output: `dist/`

**Você mencionou:** "Já foi deployado na Vercel pelo Claude Cowork"

---

## 🚨 PROBLEMA CRÍTICO IDENTIFICADO

### Edge Functions em projeto errado!

**Situação:**
```
┌─────────────────────────────────────────────────────┐
│ Frontend (.env)                                     │
│ └─ Conecta em: uhazjwqfsvxqozepyjjj                │
│    └─ Tenta chamar: pwacity-openai, pwacity-gemini │
│                                                     │
│ GitHub Actions (deploy-supabase.yml)               │
│ └─ Deploya em: gmflpmcepempcygdrayv                │
│    └─ Edge Functions vão para projeto ERRADO!      │
└─────────────────────────────────────────────────────┘
```

**Consequência:**
- ❌ Frontend chama: `https://uhazjwqfsvxqozepyjjj.supabase.co/functions/v1/pwacity-openai`
- ❌ Função está em: `https://gmflpmcepempcygdrayv.supabase.co/functions/v1/pwacity-openai`
- ❌ Resultado: **404 Not Found**

---

## ✅ SOLUÇÃO RECOMENDADA

### Opção A: Mover Edge Functions para projeto correto (RECOMENDADO)

**Ação:**
1. Atualizar `.github/workflows/deploy-supabase.yml`:
   ```yaml
   SUPABASE_PROJECT_ID: uhazjwqfsvxqozepyjjj  # ao invés de gmflpmcepempcygdrayv
   ```

2. Atualizar `supabase/config.toml`:
   ```toml
   project_id = "uhazjwqfsvxqozepyjjj"  # ao invés de gmflpmcepempcygdrayv
   ```

3. Re-deploy manual das funções:
   ```bash
   supabase functions deploy pwacity-openai --project-ref uhazjwqfsvxqozepyjjj
   supabase functions deploy pwacity-gemini --project-ref uhazjwqfsvxqozepyjjj
   ```

**Vantagens:**
- ✅ Frontend e Edge Functions no mesmo projeto
- ✅ Secrets já configuradas (OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY)
- ✅ Menos complexidade

---

### Opção B: Atualizar .env para apontar para projeto original

**Ação:**
1. Atualizar `.env`:
   ```env
   VITE_SUPABASE_PROJECT_ID="gmflpmcepempcygdrayv"
   VITE_SUPABASE_URL="https://gmflpmcepempcygdrayv.supabase.co"
   ```

2. Migrar dados de `uhazjwqfsvxqozepyjjj` para `gmflpmcepempcygdrayv`

3. Configurar secrets no projeto `gmflpmcepempcygdrayv`

**Desvantagens:**
- ❌ Requer migração de dados
- ❌ Requer reconfiguração de secrets
- ❌ Pode quebrar integrações existentes

---

## 🌍 HOSPEDAGEM: OPÇÕES DISPONÍVEIS

### 1. Vercel (Atual? Configurado mas não confirmado)

**Status:** ✅ Configurado (vercel.json existe)

**Vantagens:**
- ✅ Deploy automático via GitHub
- ✅ Edge Functions (Vercel Edge Functions)
- ✅ CDN global
- ✅ Preview deployments por PR
- ✅ Fácil configuração

**Desvantagens:**
- ❌ Custos podem escalar
- ❌ Edge Functions Vercel != Supabase Edge Functions

**Deploy:**
```bash
# Via CLI
npx vercel --prod

# Ou conectar repositório GitHub no dashboard Vercel
```

---

### 2. DigitalOcean Droplet (Opção sugerida)

**Vantagens:**
- ✅ Controle total
- ✅ Custo fixo previsível
- ✅ Já tem droplet rodando (64.225.58.182)
- ✅ Pode rodar tudo no mesmo droplet

**Desvantagens:**
- ❌ Requer configuração de servidor (nginx, pm2, etc.)
- ❌ Sem auto-scaling
- ❌ Você gerencia atualizações e segurança

**Setup necessário:**
```bash
# No droplet:
# 1. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar nginx
sudo apt install nginx

# 3. Clonar repo
git clone https://github.com/arbachegit/knowyou-production
cd knowyou-production

# 4. Build
npm install
npm run build

# 5. Configurar nginx para servir dist/
sudo nano /etc/nginx/sites-available/knowyou

# 6. PM2 para rodar (se precisar de servidor)
npm install -g pm2
pm2 start npm --name "knowyou" -- start
```

---

### 3. Lovable (Atual? Incerto)

**Status:** ⚠️ Incerto - tem dependência mas sem pasta `.lovable/`

**Vantagens:**
- ✅ Zero configuração
- ✅ Deploy automático
- ✅ Integrado com Supabase

**Desvantagens:**
- ❌ Menos controle
- ❌ Plataforma específica (vendor lock-in)

**Verificar:**
- Acessar: https://lovable.dev/projects/db155f46-a23e-47f5-98c7-87d81596f2a8
- Ver se tem deploy ativo

---

### 4. Netlify (Alternativa)

**Vantagens:**
- ✅ Similar ao Vercel
- ✅ Deploy automático
- ✅ Generoso plano free

**Desvantagens:**
- ❌ Build minutes limitados no free tier

---

## 📋 RECOMENDAÇÃO FINAL

### 🎯 **ARQUITETURA RECOMENDADA:**

```
┌────────────────────────────────────────────────────┐
│ FRONTEND (React + Vite)                            │
│ Hospedagem: Vercel OU DigitalOcean                │
│ URL: pwa.iconsai.ai                                │
└────────────────┬───────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌───────────────┐  ┌──────────────────────┐
│ SUPABASE 1    │  │ SUPABASE 2           │
│ uhazjwq...    │  │ mnfjkeg...           │
│               │  │                      │
│ - Auth        │  │ - Dados IBGE         │
│ - PWA City    │  │ - Dados SNIS         │
│ - PWA Health  │  │ - Read-only          │
│ - Edge Funcs  │  │                      │
│   * openai    │  │ Gerenciado por:      │
│   * gemini    │  │ DigitalOcean Droplet │
│   * chat      │  │ (64.225.58.182)      │
└───────────────┘  └──────────────────────┘
```

### 🚀 **AÇÕES IMEDIATAS:**

1. **CORRIGIR DEPLOY DAS EDGE FUNCTIONS:**
   ```bash
   # Atualizar .github/workflows/deploy-supabase.yml
   SUPABASE_PROJECT_ID: uhazjwqfsvxqozepyjjj

   # Atualizar supabase/config.toml
   project_id = "uhazjwqfsvxqozepyjjj"

   # Re-deploy manual
   supabase functions deploy --project-ref uhazjwqfsvxqozepyjjj
   ```

2. **CONFIRMAR HOSPEDAGEM ATUAL:**
   - Verificar se Vercel está ativo
   - Decidir: continuar Vercel ou migrar para DigitalOcean

3. **DEPRECAR PROJETO `gmflpmcepempcygdrayv`:**
   - Migrar todas as Edge Functions para `uhazjwqfsvxqozepyjjj`
   - Deletar ou arquivar o projeto antigo

---

## 📊 COMPARAÇÃO: VERCEL vs DIGITALOCEAN

| Aspecto | Vercel | DigitalOcean Droplet |
|---------|--------|----------------------|
| **Custo** | Gratuito até certo uso | $6-12/mês fixo |
| **Setup** | Zero config | Configuração manual |
| **Deploy** | Automático (Git push) | CI/CD ou manual |
| **Escalabilidade** | Automática | Manual (resize droplet) |
| **Performance** | CDN global | Single region |
| **Manutenção** | Zero | Você gerencia |
| **Controle** | Limitado | Total |
| **SSL** | Automático | Let's Encrypt manual |
| **Recomendado para** | Startups, MVPs | Produção estável |

---

## ✅ CHECKLIST DE DECISÕES

- [ ] **1. Corrigir deploy das Edge Functions** (projeto errado!)
- [ ] **2. Decidir hospedagem:** Vercel OU DigitalOcean OU manter Lovable
- [ ] **3. Se Vercel:** Conectar repo GitHub no dashboard Vercel
- [ ] **4. Se DigitalOcean:** Configurar nginx + build process
- [ ] **5. Deprecar projeto Supabase antigo** (gmflpmcepempcygdrayv)
- [ ] **6. Documentar decisões** no README.md

---

## 📞 PRÓXIMOS PASSOS

**Me responda:**

1. **Onde você quer hospedar o frontend?**
   - [ ] Vercel (atual?)
   - [ ] DigitalOcean (no droplet existente)
   - [ ] Lovable (confirmar se está ativo)
   - [ ] Outro: _____

2. **Sobre os 3 projetos Supabase:**
   - ✅ `uhazjwqfsvxqozepyjjj` = Frontend + Edge Functions (CONSOLIDAR AQUI)
   - ✅ `mnfjkegtynjtgesfphge` = Dados públicos brasileiros (MANTER)
   - ❌ `gmflpmcepempcygdrayv` = Deprecar? (CONFIRMAR)

3. **Urgência para corrigir Edge Functions?**
   - [ ] Agora (vou fazer o fix)
   - [ ] Depois (só documentar)

---

**Criado em:** 17/01/2026
**Versão:** 1.0
**Próxima revisão:** Após suas respostas
