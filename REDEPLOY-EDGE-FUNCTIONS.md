# 🚀 RE-DEPLOY EDGE FUNCTIONS - PROJETO CORRETO

**Data:** 17/01/2026
**Status:** ⚠️ AÇÃO NECESSÁRIA
**Prioridade:** 🔴 CRÍTICA

---

## ✅ CORREÇÃO APLICADA

As configurações foram atualizadas com sucesso:

| Arquivo | Mudança | Status |
|---------|---------|--------|
| `.github/workflows/deploy-supabase.yml` | `gmflpmcepempcygdrayv` → `uhazjwqfsvxqozepyjjj` | ✅ Commitado |
| `supabase/config.toml` | `gmflpmcepempcygdrayv` → `uhazjwqfsvxqozepyjjj` | ✅ Commitado |
| Commit | `a7657549` | ✅ Pushed |

---

## ⚠️ PRÓXIMO PASSO NECESSÁRIO

As funções **pwacity-openai** e **pwacity-gemini** ainda estão no projeto antigo.

Você precisa fazer um **re-deploy manual** para movê-las para o projeto correto (`uhazjwqfsvxqozepyjjj`).

---

## 🎯 OPÇÃO A: RE-DEPLOY VIA CLI (RECOMENDADO)

### Pré-requisito: Instalar Supabase CLI

**Se ainda não tem instalado:**

```bash
# macOS (via Homebrew)
brew install supabase/tap/supabase

# Ou via npm
npm install -g supabase
```

### Passo 1: Login no Supabase

```bash
supabase login
```

Isso vai abrir o browser para você fazer login.

### Passo 2: Link com o projeto correto

```bash
cd /Users/fernandoarbache/Documents/knowyou-production

supabase link --project-ref uhazjwqfsvxqozepyjjj
```

### Passo 3: Deploy das Edge Functions

```bash
# Deploy TODAS as funções de uma vez
supabase functions deploy --project-ref uhazjwqfsvxqozepyjjj
```

**Ou apenas as funções PWA City:**

```bash
# Deploy individual
supabase functions deploy pwacity-openai --project-ref uhazjwqfsvxqozepyjjj
supabase functions deploy pwacity-gemini --project-ref uhazjwqfsvxqozepyjjj
```

### Passo 4: Verificar deploy

```bash
supabase functions list --project-ref uhazjwqfsvxqozepyjjj
```

**Resultado esperado:**
```
┌────────────────────┬─────────┬──────────────────────┐
│ NAME               │ VERSION │ CREATED AT           │
├────────────────────┼─────────┼──────────────────────┤
│ pwacity-openai     │ 1       │ 2026-01-17 ...       │
│ pwacity-gemini     │ 1       │ 2026-01-17 ...       │
│ chat-router        │ ...     │ ...                  │
│ ...                │ ...     │ ...                  │
└────────────────────┴─────────┴──────────────────────┘
```

---

## 🎯 OPÇÃO B: RE-DEPLOY VIA GITHUB ACTIONS (AUTOMÁTICO)

### Como funciona:

O GitHub Actions agora está configurado para deploar no projeto correto.

**Trigger automático:**
```
on:
  push:
    branches: [main]
    paths: ['supabase/functions/**']
```

### Para forçar um re-deploy:

**Opção B1: Fazer um commit dummy**

```bash
# Touch uma função para triggerar o workflow
touch supabase/functions/pwacity-openai/index.ts

git add supabase/functions/pwacity-openai/index.ts
git commit -m "chore: trigger redeploy of Edge Functions to correct project"
git push origin main
```

**Opção B2: Workflow Dispatch (manual trigger)**

1. Acesse: https://github.com/arbachegit/knowyou-production/actions
2. Clique em "Deploy Supabase Functions"
3. Clique em "Run workflow" → selecione branch "main"
4. Aguarde 2-3 minutos

---

## 🎯 OPÇÃO C: PEDIR PARA O CLAUDE COWORK

Se o Claude Cowork tem acesso ao Supabase CLI:

1. Peça para ele executar:
   ```bash
   supabase functions deploy --project-ref uhazjwqfsvxqozepyjjj
   ```

---

## ✅ COMO VERIFICAR SE FUNCIONOU

### Teste 1: Via cURL

```bash
curl -X POST "https://uhazjwqfsvxqozepyjjj.supabase.co/functions/v1/pwacity-openai" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYXpqd3Fmc3Z4cW96ZXB5ampqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzAxODIsImV4cCI6MjA3OTk0NjE4Mn0.q7Y5y5rDlw18PrJcIIb73jAP-b1NAA5eyIaTfuunVDc" \
  -d '{
    "prompt": "Teste de conexão",
    "sessionId": "test",
    "userPhone": "+5511999999999"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "response": "...",
  "model": "gpt-4",
  "provider": "openai",
  "mock": false
}
```

**Se ainda der 404:**
- Função ainda não foi deployada no projeto correto
- Execute o re-deploy (Opção A ou B)

---

### Teste 2: Via PWA City

1. Acesse: https://pwa.iconsai.ai/pwacity
2. Faça login com telefone convidado
3. Digite: "Olá, teste de conexão"

**Resultado esperado:**
- ✅ Resposta inteligente (não MOCK)
- ✅ Sem erro 404
- ✅ Tempo de resposta: 1-4 segundos

**Se der erro:**
- Verifique os logs: https://supabase.com/dashboard/project/uhazjwqfsvxqozepyjjj/logs/edge-functions
- Execute o re-deploy

---

### Teste 3: Ver logs no Supabase

1. Acesse: https://supabase.com/dashboard/project/uhazjwqfsvxqozepyjjj/logs/edge-functions
2. Filtrar por: `pwacity-openai` ou `pwacity-gemini`
3. Enviar uma mensagem no PWA City
4. Verificar logs:

**Logs esperados:**
```
[pwacity-openai v2.0.0-PRODUCTION] Request received
[pwacity-openai] Prompt length: 15
[pwacity-openai] Calling OpenAI API...
[pwacity-openai] ✅ OpenAI response received
[pwacity-openai] Response time: 2300ms
[pwacity-openai] Tokens used: 42
```

**Se não aparecer logs:**
- Função não está deployada ainda
- Execute o re-deploy

---

## 🔍 TROUBLESHOOTING

### Erro: "Function not found" ou 404

**Causa:** Função ainda não foi deployada no projeto `uhazjwqfsvxqozepyjjj`

**Solução:** Execute o re-deploy (Opção A)

---

### Erro: "OPENAI_API_KEY not found"

**Causa:** Improvável (você já configurou as secrets)

**Verificar:**
```
https://supabase.com/dashboard/project/uhazjwqfsvxqozepyjjj/settings/functions
```

Deve aparecer:
- ✅ `OPENAI_API_KEY` = ••••••••
- ✅ `GOOGLE_GEMINI_API_KEY` = ••••••••

**Se não aparecer:** Reconfigure as secrets (ver CONFIGURAR-SUPABASE-SECRETS.md)

---

### Erro: "SUPABASE_ACCESS_TOKEN not found" (GitHub Actions)

**Causa:** Secret não configurada no repositório GitHub

**Solução:**
1. Acesse: https://github.com/arbachegit/knowyou-production/settings/secrets/actions
2. Adicione secret: `SUPABASE_ACCESS_TOKEN`
3. Valor: Gere em https://supabase.com/dashboard/account/tokens

---

### Erro: "Project not linked"

**Causa:** Supabase CLI não está linkado ao projeto

**Solução:**
```bash
supabase link --project-ref uhazjwqfsvxqozepyjjj
```

---

## 📊 STATUS ATUAL

| Item | Status | Ação |
|------|--------|------|
| GitHub Actions configurado | ✅ Correto | Commitado (a7657549) |
| supabase/config.toml | ✅ Correto | Commitado (a7657549) |
| Secrets no Supabase | ✅ Configuradas | OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY |
| **Edge Functions deployadas** | ⏳ **PENDENTE** | **← VOCÊ PRECISA FAZER AGORA** |

---

## 🎯 AÇÃO IMEDIATA

**Execute AGORA:**

```bash
# Opção mais rápida (CLI)
supabase functions deploy pwacity-openai --project-ref uhazjwqfsvxqozepyjjj
supabase functions deploy pwacity-gemini --project-ref uhazjwqfsvxqozepyjjj
```

**Ou aguarde o GitHub Actions** (próximo push em `supabase/functions/**`)

---

## ✅ CHECKLIST

- [x] GitHub Actions atualizado
- [x] supabase/config.toml atualizado
- [x] Mudanças commitadas e pushed
- [ ] **Edge Functions re-deployadas** ← VOCÊ FAZ ISSO
- [ ] Testado via PWA City
- [ ] Logs verificados no Supabase

---

**Depois de fazer o re-deploy, me avise para validarmos juntos!** 🚀

---

**Criado em:** 17/01/2026
**Commit:** a7657549
**Próxima etapa:** Re-deploy manual das Edge Functions
