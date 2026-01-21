# 🚀 SETUP PWA CITY - CONEXÃO APIS (OpenAI + Gemini)

**Data:** 17/01/2026
**Status:** ✅ Código atualizado - Aguardando deploy
**APIs:** OpenAI GPT-4 + Google Gemini Pro

---

## 📋 O QUE FOI FEITO

### 1. ✅ Credenciais Organizadas
- Arquivo `credenciais.md` criado e protegido no `.gitignore`
- Todas as credenciais consolidadas e documentadas
- Template `.env.example` criado

### 2. ✅ API OpenAI Conectada
- Edge Function `pwacity-openai` atualizada
- Versão: **2.0.0-PRODUCTION**
- Integração direta com OpenAI API (https://api.openai.com/v1/chat/completions)
- Modelo: **GPT-4**
- Sistema de fallback e tratamento de erros

### 3. ✅ API Gemini Conectada
- Edge Function `pwacity-gemini` atualizada
- Versão: **2.0.0-PRODUCTION**
- Integração direta com Gemini API (https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent)
- Modelo: **Gemini Pro**
- Sistema de fallback e tratamento de erros
- Safety settings configurados

---

## 🔧 PRÓXIMOS PASSOS PARA ATIVAR

### PASSO 1: Configurar Variáveis de Ambiente no Supabase

1. **Acesse o Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/uhazjwqfsvxqozepyjjj
   ```

2. **Navegue até Edge Functions Secrets:**
   ```
   Settings → Edge Functions → Secrets
   ```

3. **Adicione as variáveis necessárias:**

   **OPENAI_API_KEY:**
   - Nome: `OPENAI_API_KEY`
   - Valor: `[sua-openai-api-key]`

   **GOOGLE_GEMINI_API_KEY:**
   - Nome: `GOOGLE_GEMINI_API_KEY`
   - Valor: `[sua-gemini-api-key]`

4. **Clique em "Add secret" para cada variável**

5. **(Opcional) Adicionar outras variáveis que ainda não existem:**
   ```env
   GOOGLE_GEMINI_API_KEY=[sua-gemini-api-key]
   ELEVENLABS_API_KEY=[sua-elevenlabs-api-key]
   TWILIO_ACCOUNT_SID=[seu-twilio-account-sid]
   TWILIO_AUTH_TOKEN=[seu-twilio-auth-token]
   ```

---

### PASSO 2: Fazer Deploy da Edge Function

#### Opção A: Deploy via Supabase CLI (Recomendado)

1. **Instalar Supabase CLI** (se ainda não tiver):
   ```bash
   npm install -g supabase
   ```

2. **Fazer login no Supabase:**
   ```bash
   supabase login
   ```

3. **Linkar com o projeto:**
   ```bash
   cd /Users/fernandoarbache/Documents/knowyou-production
   supabase link --project-ref uhazjwqfsvxqozepyjjj
   ```

4. **Deploy das funções:**
   ```bash
   # Deploy OpenAI
   supabase functions deploy pwacity-openai

   # Deploy Gemini
   supabase functions deploy pwacity-gemini
   ```

5. **Verificar deploy:**
   ```bash
   supabase functions list
   ```

#### Opção B: Deploy via Lovable (Mais fácil)

1. **Commit e push para GitHub:**
   ```bash
   git add supabase/functions/pwacity-openai/
   git commit -m "feat: Connect PWA City to OpenAI API (v2.0.0-PRODUCTION)"
   git push origin main
   ```

2. **No Lovable:**
   - Acesse: https://lovable.dev/projects/db155f46-a23e-47f5-98c7-87d81596f2a8
   - Aguarde sync automático com GitHub
   - Deploy das duas funções será feito automaticamente (pwacity-openai e pwacity-gemini)

#### Opção C: Deploy via Dashboard Supabase

1. **Acesse:**
   ```
   https://supabase.com/dashboard/project/uhazjwqfsvxqozepyjjj/functions
   ```

2. **Clique em "Deploy new function"**

3. **Cole o código de:**
   ```
   /Users/fernandoarbache/Documents/knowyou-production/supabase/functions/pwacity-openai/index.ts
   ```

4. **Salve e faça deploy**

---

### PASSO 3: Testar a Integração

#### Teste via cURL:

```bash
curl -X POST "https://uhazjwqfsvxqozepyjjj.supabase.co/functions/v1/pwacity-openai" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -d '{
    "prompt": "Olá! Como você pode me ajudar?",
    "sessionId": "test-session",
    "userPhone": "+5511999999999"
  }'
```

#### Teste via PWA City:

1. **Acesse:** https://pwa.iconsai.ai/pwacity

2. **Faça login** com telefone convidado

3. **Digite uma mensagem** no chat

4. **Verifique a resposta**

---

## 📊 LOGS E MONITORAMENTO

### Ver Logs da Edge Function:

1. **Via Dashboard:**
   ```
   https://supabase.com/dashboard/project/uhazjwqfsvxqozepyjjj/logs/edge-functions
   ```

2. **Via CLI:**
   ```bash
   supabase functions logs pwacity-openai
   ```

### O que procurar nos logs:

- ✅ `[pwacity-openai v2.0.0-PRODUCTION] Request received`
- ✅ `[pwacity-openai] Calling OpenAI API...`
- ✅ `[pwacity-openai] ✅ OpenAI response received`
- ✅ `[pwacity-openai] Tokens used: XXX`
- ❌ `OPENAI_API_KEY not found` = Variável de ambiente não configurada

---

## 🔍 TROUBLESHOOTING

### Erro: "OPENAI_API_KEY not found"
**Solução:** Configure a variável no Supabase (ver PASSO 1)

### Erro: "OpenAI API error: 401"
**Solução:** API Key inválida ou expirada. Gerar nova em: https://platform.openai.com/api-keys

### Erro: "OpenAI API error: 429"
**Solução:** Limite de rate excedido. Aguardar ou aumentar tier na OpenAI.

### Erro: "OpenAI API error: 500"
**Solução:** Erro no servidor OpenAI. Aguardar alguns minutos e tentar novamente.

### Resposta ainda vem como MOCK
**Possíveis causas:**
1. Deploy não foi feito
2. Função antiga ainda em cache
3. Verificar versão da função nos logs (deve ser 2.0.0-PRODUCTION)

**Solução:**
```bash
# Forçar novo deploy
supabase functions deploy pwacity-openai --no-verify-jwt
```

---

## 📝 CONFIGURAÇÃO ATUAL

### Modelo OpenAI (GPT-4):
- **Model:** `gpt-4`
- **Temperature:** `0.7`
- **Max Tokens:** `2000`
- **System Prompt:** "Você é um assistente inteligente do PWA City, focado em ajudar usuários com informações gerais, recomendações e suporte. Seja objetivo, claro e prestativo. Responda em português do Brasil."

### Modelo Gemini (Gemini Pro):
- **Model:** `gemini-pro`
- **Temperature:** `0.7`
- **Top K:** `40`
- **Top P:** `0.95`
- **Max Output Tokens:** `2048`
- **Safety Settings:** BLOCK_MEDIUM_AND_ABOVE (todas categorias)
- **System Prompt:** Incluído no início do prompt do usuário

### Endpoints:
- **OpenAI API:** `https://api.openai.com/v1/chat/completions`
- **Gemini API:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`
- **PWA City OpenAI Function:** `https://uhazjwqfsvxqozepyjjj.supabase.co/functions/v1/pwacity-openai`
- **PWA City Gemini Function:** `https://uhazjwqfsvxqozepyjjj.supabase.co/functions/v1/pwacity-gemini`

---

## ✅ CHECKLIST DE ATIVAÇÃO

- [ ] **1. Configurar OPENAI_API_KEY no Supabase**
  - Dashboard → Settings → Edge Functions → Secrets
  - Adicionar variável OPENAI_API_KEY

- [ ] **2. Fazer deploy das funções**
  - Via CLI: `supabase functions deploy pwacity-openai` e `supabase functions deploy pwacity-gemini`
  - OU via Lovable (commit + push)

- [ ] **3. Testar via cURL**
  - Enviar request de teste
  - Verificar resposta real (não MOCK)

- [ ] **4. Testar via PWA City**
  - Acessar /pwacity
  - Fazer login
  - Enviar mensagem
  - Verificar resposta da IA

- [ ] **5. Monitorar logs**
  - Verificar sucesso das chamadas
  - Monitorar uso de tokens
  - Verificar tempo de resposta

---

## 🎯 PRÓXIMAS MELHORIAS (OPCIONAL)

### 1. Adicionar Contexto de Conversa
Atualmente cada mensagem é independente. Para manter contexto:

```typescript
// Buscar histórico do usuário no banco
const { data: history } = await supabase
  .from("pwacity_conversations")
  .select("prompt, response")
  .eq("phone", userPhone)
  .order("created_at", { ascending: false })
  .limit(5);

// Montar array de messages com histórico
const messages = [
  { role: "system", content: "..." },
  ...history.map(h => [
    { role: "user", content: h.prompt },
    { role: "assistant", content: h.response }
  ]).flat(),
  { role: "user", content: prompt }
];
```

### 2. Adicionar Streaming
Para respostas mais rápidas e interativas:

```typescript
stream: true,
```

### 3. Adicionar Function Calling
Para permitir que o GPT execute ações:

```typescript
functions: [
  {
    name: "get_weather",
    description: "Get weather for a location",
    parameters: { ... }
  }
],
function_call: "auto"
```

### 4. Ajustar Modelo
- **GPT-4 Turbo:** Mais rápido, mais barato
- **GPT-3.5 Turbo:** Muito mais barato, respostas mais simples

---

## 📞 SUPORTE

**Dúvidas?**
- Documentação OpenAI: https://platform.openai.com/docs
- Documentação Supabase Edge Functions: https://supabase.com/docs/guides/functions
- GitHub Issues: https://github.com/arbachegit/knowyou-production/issues

---

**Atualizado em:** 17/01/2026 - 14:30
**Versão:** 2.0 (OpenAI + Gemini conectados)
**Próxima revisão:** Após primeiro deploy
