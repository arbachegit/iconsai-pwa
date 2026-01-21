# 🔐 GUIA: CONFIGURAR SECRETS NO SUPABASE

**Data:** 17/01/2026
**Objetivo:** Configurar as API Keys do OpenAI e Gemini no Supabase
**Tempo estimado:** 3 minutos

---

## ✅ CREDENCIAIS TESTADAS E VALIDADAS

| API | Status | Detalhes |
|-----|--------|----------|
| **OpenAI GPT-4** | ✅ Testada | Respondeu: "Olá! Como posso ajudar você hoje" |
| **Gemini 2.5 Flash** | ✅ Testada | Respondeu: "Olá!" |

---

## 📍 PASSO 1: ACESSAR SUPABASE DASHBOARD

**URL direta:**
```
https://supabase.com/dashboard/project/uhazjwqfsvxqozepyjjj/settings/functions
```

Ou navegue:
1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: **brasil-data-hub** (`uhazjwqfsvxqozepyjjj`)
4. No menu lateral esquerdo, clique em: **Settings** (ícone ⚙️)
5. No submenu, clique em: **Edge Functions**

---

## 📍 PASSO 2: LOCALIZAR A SEÇÃO "SECRETS"

Na página de Edge Functions, role até encontrar:

```
┌─────────────────────────────────────┐
│  Edge Functions Configuration       │
│                                     │
│  ▼ Management API                   │
│  ▼ Secrets                         │  ← AQUI!
│  ▼ Custom Domains                   │
└─────────────────────────────────────┘
```

Clique em **"Secrets"** ou role até essa seção.

---

## 📍 PASSO 3: ADICIONAR AS DUAS SECRETS

### Secret 1 - OpenAI

Clique em **"Add new secret"** ou **"New secret"**

```
┌─────────────────────────────────────────┐
│ Add new secret                          │
├─────────────────────────────────────────┤
│ Name:                                   │
│ OPENAI_API_KEY                          │
├─────────────────────────────────────────┤
│ Value:                                  │
│ sk-proj-XPqIDTrH5haGMVdDLtDOTp0kQa... │
├─────────────────────────────────────────┤
│         [Cancel]      [Add secret]      │
└─────────────────────────────────────────┘
```

**Copie e cole EXATAMENTE:**

**Name:**
```
OPENAI_API_KEY
```

**Value:**
```
[sua-openai-api-key]
```

Clique em **"Add secret"** ou **"Save"**

---

### Secret 2 - Gemini

Clique novamente em **"Add new secret"**

```
┌─────────────────────────────────────────┐
│ Add new secret                          │
├─────────────────────────────────────────┤
│ Name:                                   │
│ GOOGLE_GEMINI_API_KEY                   │
├─────────────────────────────────────────┤
│ Value:                                  │
│ AIzaSyA7i1iZfAx6NeUX2mKNGUnYS3JrcJiEdDg │
├─────────────────────────────────────────┤
│         [Cancel]      [Add secret]      │
└─────────────────────────────────────────┘
```

**Copie e cole EXATAMENTE:**

**Name:**
```
GOOGLE_GEMINI_API_KEY
```

**Value:**
```
AIzaSyA7i1iZfAx6NeUX2mKNGUnYS3JrcJiEdDg
```

Clique em **"Add secret"** ou **"Save"**

---

## ✅ PASSO 4: VERIFICAR SE AS SECRETS FORAM SALVAS

Após adicionar, você deve ver algo assim:

```
┌─────────────────────────────────────────────────────┐
│ Secrets (2)                                         │
├─────────────────────────────────────────────────────┤
│ OPENAI_API_KEY             ••••••••••••••••  [Edit] │
│ GOOGLE_GEMINI_API_KEY      ••••••••••••••••  [Edit] │
└─────────────────────────────────────────────────────┘
```

⚠️ **Os valores ficam ocultos (••••) por segurança - isso é NORMAL!**

---

## 📍 PASSO 5: AGUARDAR REDEPLOY AUTOMÁTICO

Após salvar as secrets:

1. **O Lovable vai detectar** que as variáveis mudaram
2. **Vai fazer redeploy automático** das Edge Functions
3. **Aguarde 2-3 minutos**

Ou, se preferir forçar o deploy via CLI:

```bash
supabase functions deploy pwacity-openai
supabase functions deploy pwacity-gemini
```

---

## 🧪 PASSO 6: TESTAR!

### Teste via Browser:

1. **Acesse:** https://pwa.iconsai.ai/pwacity
2. **Faça login** com telefone convidado
3. **Digite:** "Crie um poema curto sobre inteligência artificial"
4. **Aguarde a resposta**

### ✅ SUCESSO se você ver:

- Resposta criativa e inteligente
- **NÃO** aparece a mensagem "[MODO MOCK]"
- Tempo de resposta: 1-4 segundos

### ❌ PROBLEMA se aparecer:

- "[MODO MOCK]" na resposta
- "OPENAI_API_KEY not found"
- "GOOGLE_GEMINI_API_KEY not found"
- Timeout ou erro

---

## 🔍 TROUBLESHOOTING

### Se ainda aparecer erro "API Key not found":

**Possíveis causas:**
1. Secret não foi salva corretamente
2. Deploy não foi feito
3. Nome da secret está errado

**Solução:**
1. Verifique se os nomes estão EXATAMENTE assim:
   - `OPENAI_API_KEY` (não `OPENAI_KEY` ou `OPEN_AI_API_KEY`)
   - `GOOGLE_GEMINI_API_KEY` (não `GEMINI_API_KEY` ou `GOOGLE_API_KEY`)
2. Verifique se não há espaços antes ou depois
3. Refaça o deploy:
   ```bash
   supabase functions deploy pwacity-openai
   supabase functions deploy pwacity-gemini
   ```

---

### Ver logs para diagnosticar:

**Via Dashboard:**
```
https://supabase.com/dashboard/project/uhazjwqfsvxqozepyjjj/logs/edge-functions
```

**Procurar por:**
- ✅ `[pwacity-openai v2.0.0-PRODUCTION] Request received`
- ✅ `[pwacity-gemini v2.1.0-PRODUCTION] Request received`
- ✅ `✅ OpenAI response received`
- ✅ `✅ Gemini response received`

**Erros comuns:**
- ❌ `OPENAI_API_KEY not found` = Secret não configurada
- ❌ `OpenAI API error: 401` = API Key inválida
- ❌ `Gemini API error: 404` = Modelo não encontrado (já corrigido!)

---

## 📊 RESUMO DO QUE PRECISA CONFIGURAR

| Secret Name | Secret Value | Status |
|-------------|--------------|--------|
| `OPENAI_API_KEY` | `sk-proj-XPqIDTrH5ha...` | ⏳ Para você configurar |
| `GOOGLE_GEMINI_API_KEY` | `AIzaSyA7i1iZfAx6Ne...` | ⏳ Para você configurar |

---

## ✅ CHECKLIST

- [ ] **1. Acessei o Supabase Dashboard**
- [ ] **2. Naveguei até Settings → Edge Functions → Secrets**
- [ ] **3. Adicionei a secret `OPENAI_API_KEY`**
- [ ] **4. Adicionei a secret `GOOGLE_GEMINI_API_KEY`**
- [ ] **5. Verifiquei que as 2 secrets aparecem na lista**
- [ ] **6. Aguardei 2-3 minutos para redeploy**
- [ ] **7. Testei no PWA City**
- [ ] **8. Recebi resposta SEM "[MODO MOCK]"**

---

## 🎯 RESULTADO ESPERADO

Após configurar corretamente, ao enviar uma mensagem no PWA City:

**ANTES (com MOCK):**
```
Olá! Esta é uma resposta MOCK. [MODO MOCK]
Configure as credenciais para usar a IA real.
```

**DEPOIS (com APIs funcionando):**
```
Claro! Aqui está um poema sobre inteligência artificial:

No vasto mar de dados, navega a mente digital,
Aprendendo, evoluindo, em busca do saber total.
Redes neurais conectadas, em harmonia virtual,
A inteligência artificial, um salto monumental!
```

---

**Dúvidas?** Consulte:
- `credenciais.md` - Todas as credenciais
- `TESTE-PWACITY-APIS.md` - Guia completo de testes
- Logs do Supabase para diagnóstico

---

**Criado em:** 17/01/2026
**Atualizado por:** Claude Sonnet 4.5
