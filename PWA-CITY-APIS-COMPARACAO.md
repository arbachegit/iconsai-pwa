# 🤖 PWA CITY - COMPARAÇÃO: OpenAI vs Gemini

**Data:** 17/01/2026
**Status:** ✅ Ambas APIs conectadas e prontas para deploy

---

## 🎯 RESUMO EXECUTIVO

O PWA City agora suporta **DUAS APIs de IA**, permitindo escolher qual usar através da configuração no banco de dados.

| API | Modelo | Status | Custo | Velocidade | Qualidade |
|-----|--------|--------|-------|------------|-----------|
| **OpenAI** | GPT-4 | ✅ Conectada | 💰💰💰 Alto | 🐢 Moderada | ⭐⭐⭐⭐⭐ Excelente |
| **Gemini** | Gemini Pro | ✅ Conectada | 💰 Baixo | 🚀 Rápida | ⭐⭐⭐⭐ Muito Boa |

---

## 📊 COMPARAÇÃO DETALHADA

### 1. OPENAI GPT-4

#### ✅ Vantagens
- **Qualidade superior** - Respostas mais elaboradas e contextualizadas
- **Melhor em português** - Treinado com mais dados em PT-BR
- **Raciocínio complexo** - Melhor em problemas que exigem lógica
- **Criatividade** - Excelente em respostas criativas
- **Consistência** - Respostas mais previsíveis e confiáveis

#### ❌ Desvantagens
- **Custo elevado** - $0.03 por 1K tokens (input) + $0.06 por 1K tokens (output)
- **Velocidade menor** - Média de 2-4 segundos por resposta
- **Rate limits** - Limites mais restritivos em tier gratuito

#### 💰 Custos Estimados
```
Exemplo de conversa (500 tokens input + 1000 tokens output):
Input:  500 tokens × $0.03 = $0.015
Output: 1000 tokens × $0.06 = $0.060
Total: $0.075 por conversa

1000 conversas/mês = $75/mês
```

#### ⚙️ Configuração Atual
```typescript
{
  model: "gpt-4",
  temperature: 0.7,
  max_tokens: 2000,
  system_prompt: "Você é um assistente inteligente do PWA City..."
}
```

---

### 2. GOOGLE GEMINI PRO

#### ✅ Vantagens
- **Gratuito** - Até 60 requests/minuto grátis
- **Velocidade superior** - Média de 1-2 segundos por resposta
- **Rate limits generosos** - 60 RPM gratuito
- **Boa qualidade** - Respostas competitivas com GPT-3.5
- **Multimodal** - Suporta texto + imagem (Gemini Pro Vision)

#### ❌ Desvantagens
- **Qualidade inferior ao GPT-4** - Mas superior ao GPT-3.5
- **Português menos natural** - Às vezes respostas mais "traduzidas"
- **Safety filters agressivos** - Pode bloquear conteúdo legítimo
- **Menos criativo** - Respostas mais factuais

#### 💰 Custos Estimados
```
Tier Gratuito:
- 60 requests/minuto
- Grátis para sempre

Tier Pago (quando necessário):
Input: $0.00025 por 1K tokens
Output: $0.0005 por 1K tokens

Exemplo de conversa (500 tokens input + 1000 tokens output):
Input:  500 tokens × $0.00025 = $0.000125
Output: 1000 tokens × $0.0005 = $0.0005
Total: $0.000625 por conversa

1000 conversas/mês = $0.63/mês (120x mais barato!)
```

#### ⚙️ Configuração Atual
```typescript
{
  model: "gemini-pro",
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
  safetySettings: "BLOCK_MEDIUM_AND_ABOVE"
}
```

---

## 🔄 COMO TROCAR ENTRE AS APIs

### Opção 1: Via Banco de Dados (Dinâmico)

1. **Acesse a tabela `pwacity_config`:**
   ```sql
   UPDATE pwacity_config
   SET config_value = 'gemini'  -- ou 'openai'
   WHERE config_key = 'default_api_provider';
   ```

2. **Sem necessidade de redeploy!**
   - A mudança é instantânea
   - Próxima mensagem já usa a nova API

### Opção 2: Via Código (Fixo)

No arquivo `src/components/pwacity/PWACityContainer.tsx` (linha 62-72):

```typescript
// Mudar de:
const apiProvider = configData?.config_value || "openai";

// Para fixo OpenAI:
const apiProvider = "openai";

// Ou fixo Gemini:
const apiProvider = "gemini";
```

---

## 🎯 RECOMENDAÇÕES DE USO

### Use **OpenAI GPT-4** quando:
- ✅ Qualidade da resposta é crítica
- ✅ Precisa de raciocínio complexo
- ✅ Está lidando com clientes pagantes
- ✅ Português natural é essencial
- ✅ Criatividade é importante

### Use **Gemini Pro** quando:
- ✅ Custo é uma preocupação
- ✅ Velocidade é prioridade
- ✅ Volume alto de requisições
- ✅ Usuários em teste/trial
- ✅ Respostas factuais simples

---

## 💡 ESTRATÉGIA HÍBRIDA RECOMENDADA

### Tier por Tipo de Usuário:

```javascript
// Pseudo-código
if (user.isPremium || user.isVIP) {
  apiProvider = "openai";  // GPT-4 - Melhor qualidade
} else if (user.isTrial || user.isFree) {
  apiProvider = "gemini";  // Gemini - Grátis
} else {
  apiProvider = "gemini";  // Default: Gemini (custo zero)
}
```

### Tier por Volume Mensal:

```javascript
// Verificar uso mensal
const monthlyRequests = await getMonthlyRequestCount(user.phone);

if (monthlyRequests < 100) {
  apiProvider = "openai";   // Baixo volume = pode usar GPT-4
} else {
  apiProvider = "gemini";   // Alto volume = economizar com Gemini
}
```

### Tier por Tipo de Pergunta:

```javascript
// Análise simples do prompt
if (prompt.includes("criar") || prompt.includes("escrever") || prompt.includes("sugerir")) {
  apiProvider = "openai";   // Tarefas criativas = GPT-4
} else {
  apiProvider = "gemini";   // Perguntas factuais = Gemini
}
```

---

## 📈 ESTIMATIVA DE CUSTOS MENSAIS

### Cenário 1: 1000 usuários, 10 mensagens/mês cada

**OpenAI (100% GPT-4):**
```
10,000 conversas × $0.075 = $750/mês
```

**Gemini (100% Gemini Pro):**
```
10,000 conversas × $0.00063 = $6.30/mês
```

**Híbrido (20% GPT-4, 80% Gemini):**
```
2,000 conversas × $0.075 = $150 (GPT-4)
8,000 conversas × $0.00063 = $5 (Gemini)
Total: $155/mês
```

### Cenário 2: 10,000 usuários, 5 mensagens/mês cada

**OpenAI (100% GPT-4):**
```
50,000 conversas × $0.075 = $3,750/mês
```

**Gemini (100% Gemini Pro):**
```
50,000 conversas × $0.00063 = $31.50/mês
```

**Híbrido (10% GPT-4, 90% Gemini):**
```
5,000 conversas × $0.075 = $375 (GPT-4)
45,000 conversas × $0.00063 = $28.35 (Gemini)
Total: $403.35/mês
```

---

## 🧪 COMO TESTAR AS DUAS APIS

### Teste A/B Manual:

1. **Configurar para OpenAI:**
   ```sql
   UPDATE pwacity_config SET config_value = 'openai' WHERE config_key = 'default_api_provider';
   ```

2. **Enviar pergunta:**
   ```
   "Crie um roteiro de viagem de 3 dias para São Paulo"
   ```

3. **Anotar:**
   - Tempo de resposta
   - Qualidade da resposta
   - Naturalidade do português

4. **Configurar para Gemini:**
   ```sql
   UPDATE pwacity_config SET config_value = 'gemini' WHERE config_key = 'default_api_provider';
   ```

5. **Enviar a MESMA pergunta:**
   ```
   "Crie um roteiro de viagem de 3 dias para São Paulo"
   ```

6. **Comparar resultados**

### Teste Automatizado (Futuro):

Criar um endpoint `/test-apis` que envia a mesma pergunta para ambas e retorna:
```json
{
  "openai": {
    "response": "...",
    "responseTime": 2300,
    "tokens": 450
  },
  "gemini": {
    "response": "...",
    "responseTime": 1200,
    "tokens": 380
  }
}
```

---

## 📝 CONFIGURAÇÃO NO BANCO DE DADOS

### Tabela `pwacity_config`:

| config_key | config_value | Opções |
|------------|--------------|--------|
| `default_api_provider` | `openai` ou `gemini` | Define qual API usar |
| `openai_model` | `gpt-4` | Pode trocar para `gpt-3.5-turbo` |
| `gemini_model` | `gemini-pro` | Pode trocar para `gemini-pro-vision` |
| `max_tokens` | `2000` | Limite de tokens na resposta |
| `temperature` | `0.7` | Criatividade (0-1) |

### Exemplo de Query:

```sql
-- Ver configuração atual
SELECT * FROM pwacity_config WHERE config_key = 'default_api_provider';

-- Trocar para OpenAI
UPDATE pwacity_config SET config_value = 'openai' WHERE config_key = 'default_api_provider';

-- Trocar para Gemini
UPDATE pwacity_config SET config_value = 'gemini' WHERE config_key = 'default_api_provider';

-- Trocar modelo OpenAI para GPT-3.5 (mais barato)
UPDATE pwacity_config SET config_value = 'gpt-3.5-turbo' WHERE config_key = 'openai_model';
```

---

## 🔐 SEGURANÇA E RATE LIMITS

### OpenAI:
- **Rate Limit:** Varia por tier (verificar em: https://platform.openai.com/account/limits)
- **Tier 1 (Free):** 3 RPM (requests por minuto), 40,000 tokens/minuto
- **Tier 2:** 3,500 RPM, 80,000 tokens/minuto
- **Tier 3:** 7,000 RPM, 160,000 tokens/minuto

### Gemini:
- **Rate Limit Free:** 60 RPM (muito generoso!)
- **Rate Limit Paid:** Negociável
- **Quota:** 1,500 requests/dia (free tier)

---

## ✅ CHECKLIST FINAL

### APIs Conectadas:
- [x] **OpenAI GPT-4** - Código pronto
- [x] **Gemini Pro** - Código pronto
- [ ] Variáveis configuradas no Supabase
- [ ] Deploy realizado
- [ ] Testes executados

### Próximos Passos:
1. Configurar variáveis de ambiente (OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY)
2. Deploy das Edge Functions
3. Testar ambas as APIs
4. Definir estratégia: usar só uma ou híbrida
5. Monitorar custos

---

## 📞 LINKS ÚTEIS

- **OpenAI Dashboard:** https://platform.openai.com/account/usage
- **Gemini API Dashboard:** https://makersuite.google.com/app/apikey
- **PWA City Config (DB):** Tabela `pwacity_config`
- **Docs OpenAI:** https://platform.openai.com/docs
- **Docs Gemini:** https://ai.google.dev/docs

---

**Criado em:** 17/01/2026
**Versão:** 1.0
**Autor:** Claude + Fernando
