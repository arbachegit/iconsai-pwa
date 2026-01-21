# KnowYOU PWA - Guia Rápido de Extração

## 📋 Resumo

Este guia contém todas as informações necessárias para criar um projeto **knowyou-pwa** separado, extraindo apenas os componentes PWA do projeto **knowyou-production** sem modificar o código original.

---

## 📦 Arquivos de Referência Criados

1. **PWA-EXTRACTION-GUIDE.md** - Guia completo e detalhado (16 seções)
2. **PWA-package.json** - Dependencies simplificadas para o novo projeto
3. **README-PWA.md** - Este arquivo (resumo executivo)

---

## 🎯 O que é o KnowYOU PWA?

Um **assistente de voz mobile-first** com 5 módulos especializados:

- **HOME** - Saudações contextuais
- **HELP** - Tutorial e ajuda
- **WORLD** - Conhecimento geral
- **HEALTH** - Triagem médica (OLDCARTS)
- **IDEAS** - Validação de ideias

**Tecnologias:** React + TypeScript + Vite + Tailwind + Supabase + Zustand

**Autenticação:** SMS/WhatsApp (sem senha, apenas telefone verificado)

---

## 🚀 Como Começar

### Passo 1: Ler a Documentação

Leia o arquivo **PWA-EXTRACTION-GUIDE.md** completamente. Ele contém:

- ✅ Lista completa de 44 componentes PWA
- ✅ 6 hooks personalizados necessários
- ✅ 3 stores Zustand
- ✅ 11 Edge Functions do Supabase
- ✅ 9 tabelas do banco de dados
- ✅ 4 RPC functions SQL
- ✅ Dependências npm (25 essenciais vs 94 originais)
- ✅ Configurações Vite, Tailwind, TypeScript
- ✅ Checklist de migração (11 fases)

### Passo 2: Criar Novo Projeto

```bash
# Fora do diretório knowyou-production
cd ..
npm create vite@latest knowyou-pwa -- --template react-swc-ts
cd knowyou-pwa
```

### Passo 3: Instalar Dependências

```bash
# Copiar PWA-package.json para package.json
cp ../knowyou-production/PWA-package.json package.json

# Instalar
npm install

# Instalar Shadcn-ui CLI
npx shadcn@latest init
```

### Passo 4: Configurar Estrutura

```bash
# Criar estrutura de pastas
mkdir -p src/components/pwa/{voice,modules,containers,history,microphone,microservices}
mkdir -p src/components/gates
mkdir -p src/components/ui
mkdir -p src/hooks
mkdir -p src/stores
mkdir -p src/utils
mkdir -p src/lib
mkdir -p src/integrations/supabase
mkdir -p src/types
```

### Passo 5: Copiar Arquivos

Copie os arquivos do projeto original seguindo a lista em **PWA-EXTRACTION-GUIDE.md**:

#### Componentes PWA (44 arquivos)
```bash
cp -r ../knowyou-production/src/components/pwa/* src/components/pwa/
```

#### Gates (2 arquivos)
```bash
cp ../knowyou-production/src/components/gates/PWAAuthGate.tsx src/components/gates/
cp ../knowyou-production/src/components/gates/DeviceGate.tsx src/components/gates/
```

#### Stores (3 arquivos)
```bash
cp ../knowyou-production/src/stores/pwaVoiceStore.ts src/stores/
cp ../knowyou-production/src/stores/historyStore.ts src/stores/
cp ../knowyou-production/src/stores/audioManagerStore.ts src/stores/
```

#### Hooks (6 arquivos)
```bash
cp ../knowyou-production/src/hooks/usePWAAuth.ts src/hooks/
cp ../knowyou-production/src/hooks/useConfigPWA.ts src/hooks/
cp ../knowyou-production/src/hooks/usePWAConversations.ts src/hooks/
cp ../knowyou-production/src/hooks/useDeviceFingerprint.ts src/hooks/
cp ../knowyou-production/src/hooks/useDeviceDetection.ts src/hooks/
cp ../knowyou-production/src/hooks/use-toast.ts src/hooks/
```

#### Utilitários (2 arquivos)
```bash
cp ../knowyou-production/src/utils/safari-audio.ts src/utils/
cp ../knowyou-production/src/utils/safari-detect.ts src/utils/
```

#### Supabase Client
```bash
cp ../knowyou-production/src/integrations/supabase/client.ts src/integrations/supabase/
cp ../knowyou-production/src/integrations/supabase/types.ts src/integrations/supabase/
```

### Passo 6: Instalar Componentes Shadcn-ui

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add toast
npx shadcn@latest add dialog
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
npx shadcn@latest add avatar
npx shadcn@latest add progress
npx shadcn@latest add skeleton
```

E instalar manualmente o **input-otp** (não tem no Shadcn):

```bash
npm install input-otp
```

Copiar o componente:
```bash
cp ../knowyou-production/src/components/ui/input-otp.tsx src/components/ui/
```

### Passo 7: Configurar Arquivos de Config

#### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
});
```

#### .env
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### index.html
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="KnowYOU" />
    <link rel="manifest" href="/manifest.json" />
    <title>KnowYOU Voice Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  .pwa-scroll-lock {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
  }

  .pwa-no-select {
    -webkit-user-select: none;
    user-select: none;
  }

  .pwa-fullscreen {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
  }
}
```

### Passo 8: Criar App.tsx Simplificado

```typescript
// src/App.tsx
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PWAVoiceAssistant } from "./components/pwa/voice/PWAVoiceAssistant";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PWAVoiceAssistant />} />
        <Route path="/pwa" element={<PWAVoiceAssistant />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
```

### Passo 9: Configurar Supabase Backend

#### 9.1. Criar Projeto Supabase
```bash
# Se não tiver Supabase CLI instalado
npm install -g supabase

# Inicializar
supabase init

# Logar
supabase login
```

#### 9.2. Criar Tabelas

Ver arquivo **PWA-EXTRACTION-GUIDE.md** seção 9 para scripts SQL das tabelas:

- pwa_config
- pwa_sessions
- pwa_messages
- pwa_user_devices
- pwa_conversation_sessions
- pwa_conversation_messages
- pwa_conv_summaries
- security_bans
- device_fingerprints
- user_invitations

#### 9.3. Criar RPC Functions

Ver arquivo **PWA-EXTRACTION-GUIDE.md** seção 10 para scripts SQL:

- check_pwa_access
- login_pwa
- verify_pwa_code
- get_pwa_users_aggregated

#### 9.4. Copiar Edge Functions

```bash
# Copiar as 11 Edge Functions necessárias
mkdir -p supabase/functions

# Lista de functions (ver PWA-EXTRACTION-GUIDE.md seção 8):
cp -r ../knowyou-production/supabase/functions/chat-router supabase/functions/
cp -r ../knowyou-production/supabase/functions/text-to-speech supabase/functions/
cp -r ../knowyou-production/supabase/functions/voice-to-text supabase/functions/
cp -r ../knowyou-production/supabase/functions/send-sms supabase/functions/
cp -r ../knowyou-production/supabase/functions/send-whatsapp supabase/functions/
cp -r ../knowyou-production/supabase/functions/pwa-save-message supabase/functions/
cp -r ../knowyou-production/supabase/functions/pwa-get-history supabase/functions/
cp -r ../knowyou-production/supabase/functions/pwa-contextual-memory supabase/functions/
cp -r ../knowyou-production/supabase/functions/generate-contextual-greeting supabase/functions/
cp -r ../knowyou-production/supabase/functions/check-ban-status supabase/functions/
cp -r ../knowyou-production/supabase/functions/report-security-violation supabase/functions/
```

### Passo 10: Testar Localmente

```bash
npm run dev
```

Abra http://localhost:8080 no navegador mobile ou use DevTools para emular mobile.

---

## 🧪 Testes Necessários

### ✅ Checklist de Testes

- [ ] **Autenticação**
  - [ ] Login com telefone
  - [ ] Recebimento de SMS
  - [ ] Verificação de código
  - [ ] Persistência de sessão

- [ ] **Módulos**
  - [ ] HOME - Saudação contextual
  - [ ] HELP - Tutorial funciona
  - [ ] WORLD - Perguntas e respostas
  - [ ] HEALTH - Triagem OLDCARTS
  - [ ] IDEAS - Validação de ideias

- [ ] **Áudio**
  - [ ] Play/Pause funciona
  - [ ] Spectrum analyzer funciona
  - [ ] Safari/iOS não bloqueia autoplay
  - [ ] Apenas 1 áudio toca por vez

- [ ] **Histórico**
  - [ ] Mensagens são salvas
  - [ ] Histórico carrega corretamente
  - [ ] Filtro por módulo funciona

- [ ] **Navegação**
  - [ ] Trocar entre módulos funciona
  - [ ] Voltar para HOME funciona
  - [ ] Footer de módulos funciona

- [ ] **Dispositivos**
  - [ ] Safari (iOS)
  - [ ] Chrome (Android)
  - [ ] Chrome (Desktop - modo mobile)

- [ ] **Segurança**
  - [ ] Device fingerprinting funciona
  - [ ] Ban de dispositivo funciona

---

## 📊 Comparação de Tamanho

### Projeto Original (knowyou-production)

```
Componentes:  300+ arquivos
Dependências: 94 pacotes npm
Edge Functions: 80+ functions
Tabelas DB:   40+ tabelas
Linhas:       ~200,000 LOC
Complexidade: ★★★★★ (Enterprise SaaS)
```

### Projeto PWA (knowyou-pwa)

```
Componentes:  ~60 arquivos
Dependências: 25 pacotes npm
Edge Functions: 11 functions
Tabelas DB:   9 tabelas
Linhas:       ~15,000 LOC
Complexidade: ★★☆☆☆ (PWA Mobile)
```

**Redução:** ~93% do código original removido! 🎉

---

## 🎨 Customizações Recomendadas

### 1. Remover funcionalidades desnecessárias

- Security Shield completo (manter apenas fingerprint básico)
- Componentes _legacy (avaliar quais ainda são usados)
- Módulos que você não precisa (ex: IDEAS, HEALTH)

### 2. Simplificar autenticação

Se não precisar de convites, pode simplificar para:
- Login direto com telefone
- Código enviado automaticamente
- Sem tabela de convites

### 3. Personalizar módulos

- Adicionar novos módulos específicos para seu caso de uso
- Remover módulos existentes que não fazem sentido
- Customizar prompts dos agentes

### 4. Mudar tema/branding

- Cores em `tailwind.config.ts`
- Logo e ícones em `/public`
- Textos em cada módulo

---

## 🔗 Estrutura de Pastas Final

```
knowyou-pwa/
├── node_modules/
├── public/
│   ├── manifest.json
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── components/
│   │   ├── pwa/              (44 arquivos)
│   │   ├── gates/            (2 arquivos)
│   │   └── ui/               (14 arquivos)
│   ├── hooks/                (6 arquivos)
│   ├── stores/               (3 arquivos)
│   ├── utils/                (2 arquivos)
│   ├── lib/                  (1 arquivo)
│   ├── integrations/         (2 arquivos)
│   ├── types/                (conforme necessário)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   ├── functions/            (11 Edge Functions)
│   └── migrations/           (Scripts SQL)
├── .env
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

**Total de arquivos principais:** ~100 arquivos (vs 1000+ no original)

---

## 📞 Próximos Passos

1. **Revisar** o PWA-EXTRACTION-GUIDE.md completo
2. **Seguir** o checklist de migração (11 fases)
3. **Testar** cada módulo individualmente
4. **Customizar** conforme suas necessidades
5. **Deploy** em produção

---

## 💡 Dicas Importantes

### Safari/iOS
- Sempre testar em device real (não apenas simulador)
- Audio unlock é CRÍTICO (não funciona sem)
- PWA install prompt é diferente do Chrome

### Performance
- Use lazy loading para módulos
- Cache de áudio é importante
- Minimize re-renders com React.memo

### Segurança
- Não remova device fingerprinting (essencial para sessões)
- Mantenha validação de código no backend
- Use HTTPS sempre (PWA exige)

### UX
- Feedback visual em todas as ações
- Loading states claros
- Erros amigáveis (não técnicos)

---

## ✅ Validação Final

Antes de considerar a migração completa:

1. ✅ Todos os 5 módulos funcionam
2. ✅ Autenticação funciona em mobile
3. ✅ Áudio funciona em Safari e Chrome
4. ✅ Histórico salva e carrega corretamente
5. ✅ Sem erros no console
6. ✅ PWA instala corretamente
7. ✅ Performance é aceitável
8. ✅ Testes em devices reais (iOS + Android)

---

**Boa sorte com a extração! 🚀**

Se tiver dúvidas, consulte o **PWA-EXTRACTION-GUIDE.md** para detalhes técnicos.
