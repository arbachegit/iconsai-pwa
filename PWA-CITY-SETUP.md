# 🏙️ PWA City - Guia de Configuração

## 📋 Visão Geral

O **PWA City** é um microserviço de chat IA totalmente separado do PWA principal, com:
- Autenticação própria (telefone + OTP)
- Banco de dados separado
- Integração com OpenAI e Google Gemini
- Controle de acesso por role (admin/superadmin)

---

## ✅ Etapa 1: Aplicar Migração SQL no Supabase

### 1. Acesse o Supabase Dashboard
- Vá para: https://app.supabase.com
- Selecione seu projeto

### 2. Execute a Migração
1. Clique em **SQL Editor** no menu lateral
2. Clique em **New Query**
3. Cole o conteúdo do arquivo:
   ```
   supabase/migrations/20260117_create_pwacity_tables.sql
   ```
4. Clique em **Run** (ou F5)

### 3. Verificar Criação
Execute esta query para confirmar:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'pwacity%';
```

Você deve ver:
- `pwacity_config`
- `pwacity_sessions`
- `pwacity_invites`
- `pwacity_conversations`

---

## ✅ Etapa 2: Deploy das Edge Functions (Mockadas)

As Edge Functions estão **mockadas** e prontas para uso em desenvolvimento. Você pode substituí-las pelas APIs reais da DigitalOcean posteriormente.

### Deploy via Supabase CLI

```bash
# 1. Login no Supabase (se ainda não fez)
supabase login

# 2. Link com seu projeto
supabase link --project-ref SEU_PROJECT_REF

# 3. Deploy das funções
supabase functions deploy pwacity-openai
supabase functions deploy pwacity-gemini
```

### Verificar Deploy
```bash
# Listar funções
supabase functions list

# Testar função
supabase functions invoke pwacity-openai --body '{"prompt":"Olá"}'
```

---

## ✅ Etapa 3: Criar Primeiro Convite (PWA City)

Para testar o PWA City, você precisa criar um convite:

```sql
-- Inserir convite de teste
INSERT INTO public.pwacity_invites (invite_code, name, phone, status)
VALUES ('TEST001', 'Usuário Teste', '+5511999999999', 'pending');
```

**Importante:** Use seu telefone real para receber o código OTP via SMS.

---

## ✅ Etapa 4: Configurar Admin Panel

1. Acesse o Admin: `https://seu-dominio.com/admin`
2. Vá em **Config. PWA**
3. Configure o **PWA City**:
   - ✅ Ative o toggle "Permitir Acesso Desktop (Admin)"
   - ✅ Escolha o provedor de IA (OpenAI ou Gemini)
4. Clique em **"Acessar PWA City"**

---

## 🔄 Etapa 5: Substituir APIs Mockadas (Futuro)

Quando suas APIs na DigitalOcean estiverem prontas:

### 1. Editar Edge Function - OpenAI
```typescript
// supabase/functions/pwacity-openai/index.ts

// Substitua o bloco MOCKADO por:
const response = await fetch("https://sua-api-digitalocean.com/openai", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${Deno.env.get("DIGITALOCEAN_API_KEY")}`,
  },
  body: JSON.stringify({
    prompt,
    sessionId,
    userPhone,
    model: "gpt-4",
  }),
});

const data = await response.json();
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
```

### 2. Editar Edge Function - Gemini
```typescript
// supabase/functions/pwacity-gemini/index.ts

// Mesmo processo, substituindo pela URL da DigitalOcean
const response = await fetch("https://sua-api-digitalocean.com/gemini", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${Deno.env.get("DIGITALOCEAN_API_KEY")}`,
  },
  body: JSON.stringify({
    prompt,
    sessionId,
    userPhone,
    model: "gemini-pro",
  }),
});
```

### 3. Configurar Variáveis de Ambiente
```bash
# Adicionar API key da DigitalOcean
supabase secrets set DIGITALOCEAN_API_KEY=sua_key_aqui
```

### 4. Redeploy
```bash
supabase functions deploy pwacity-openai
supabase functions deploy pwacity-gemini
```

---

## 🧪 Como Testar

### Desktop (Admin/SuperAdmin)
1. Ative o toggle "Permitir Acesso Desktop (Admin)" no Admin Panel
2. Acesse: `https://seu-dominio.com/pwacity`
3. Faça login com seu telefone
4. Digite "Olá" e veja a resposta mockada

### Mobile (Qualquer Usuário)
1. Acesse pelo celular: `https://seu-dominio.com/pwacity`
2. Faça login com telefone + OTP
3. Teste o chat

---

## 📊 Estrutura de Arquivos

```
src/
├── components/
│   ├── gates/
│   │   ├── PWACityDeviceGate.tsx      # Controle de dispositivo
│   │   ├── PWACityAuthGate.tsx        # Autenticação
│   │   └── PWACityDesktopBlock.tsx    # Bloqueio desktop
│   ├── pwacity/                       # Componentes do PWA City
│   │   ├── PWACityHeader.tsx
│   │   ├── PWACityContainer.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ResultArea.tsx
│   │   └── PromptArea.tsx
│   └── admin/
│       └── PWATab.tsx                 # Config admin (atualizado)
├── hooks/
│   └── usePWACityAuth.ts              # Hook de autenticação
├── pages/
│   └── PWACityPage.tsx                # Página principal
└── App.tsx                            # Rota /pwacity

supabase/
├── migrations/
│   └── 20260117_create_pwacity_tables.sql
└── functions/
    ├── pwacity-openai/
    │   └── index.ts                   # Edge Function (mockada)
    └── pwacity-gemini/
        └── index.ts                   # Edge Function (mockada)
```

---

## 🔐 Regras de Acesso

### Mobile
- ✅ Sempre permite acesso
- ✅ Autenticação via telefone + OTP

### Desktop
- ❌ Usuários comuns: **NUNCA**
- ✅ Admin/SuperAdmin: apenas com toggle ativo

---

## 🚀 Próximos Passos

1. ✅ Aplicar migração SQL
2. ✅ Deploy das Edge Functions mockadas
3. ✅ Criar convite de teste
4. ✅ Testar fluxo completo
5. ⏳ Conectar APIs reais da DigitalOcean (quando prontas)

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase: https://app.supabase.com → Logs
2. Verifique o console do navegador (F12)
3. Verifique se as tabelas foram criadas corretamente

---

**Status:** ✅ Pronto para uso em desenvolvimento (modo mock)
**Versão:** 1.0.0
**Data:** 2026-01-17
