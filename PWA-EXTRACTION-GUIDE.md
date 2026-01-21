# Guia de Extração do KnowYOU PWA

**Data:** 2026-01-16
**Versão:** 1.0
**Objetivo:** Extrair o PWA do projeto `knowyou-production` para um novo projeto independente `knowyou-pwa`

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Componentes PWA](#componentes-pwa)
4. [Hooks Personalizados](#hooks-personalizados)
5. [Stores (Zustand)](#stores-zustand)
6. [Utilitários e Bibliotecas](#utilitários-e-bibliotecas)
7. [Dependências npm](#dependências-npm)
8. [Edge Functions (Supabase)](#edge-functions-supabase)
9. [Tabelas do Banco de Dados](#tabelas-do-banco-de-dados)
10. [RPC Functions](#rpc-functions)
11. [Configurações](#configurações)
12. [Rotas](#rotas)
13. [Assets e Estilos](#assets-e-estilos)
14. [Checklist de Migração](#checklist-de-migração)

---

## 1. Visão Geral

O **KnowYOU PWA** é um assistente de voz mobile-first com 5 módulos especializados:

- **HOME** - Saudações contextuais e navegação
- **HELP** - Tutorial e ajuda
- **WORLD** - Conhecimento geral (perguntas e respostas)
- **HEALTH** - Triagem médica com protocolo OLDCARTS
- **IDEAS** - Validação de ideias (Advogado do Diabo)

### Tecnologias Principais

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + Shadcn-ui (Radix UI)
- **Estado:** Zustand + React Query
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Autenticação:** SMS/WhatsApp (via telefone)
- **Áudio:** Web Audio API + Safari optimizations

---

## 2. Estrutura de Arquivos

```
knowyou-pwa/
├── src/
│   ├── components/
│   │   ├── pwa/                      # Componentes PWA
│   │   │   ├── voice/               # Interface de voz
│   │   │   ├── modules/             # Módulos (Health, World, etc)
│   │   │   ├── containers/          # Containers com lógica
│   │   │   ├── history/             # Histórico de conversas
│   │   │   ├── microphone/          # Controles de microfone
│   │   │   └── microservices/       # Componentes reutilizáveis
│   │   ├── gates/                   # Gates de autenticação
│   │   └── ui/                      # Componentes Shadcn-ui
│   ├── hooks/                        # Hooks personalizados
│   ├── stores/                       # Stores Zustand
│   ├── utils/                        # Utilitários
│   ├── lib/                          # Bibliotecas auxiliares
│   ├── integrations/                 # Clientes Supabase
│   ├── types/                        # TypeScript types
│   └── App.tsx                       # Aplicação principal
├── supabase/
│   ├── functions/                    # Edge Functions
│   └── migrations/                   # Migrations SQL
├── public/
│   └── manifest.json                 # PWA manifest
└── index.html                        # Entry point
```

---

## 3. Componentes PWA

### 3.1. Componentes Principais

#### `/components/pwa/voice/`

```
✅ PWAVoiceAssistant.tsx          - Componente raiz do PWA (v5.4.0)
✅ SplashScreen.tsx                - Tela de splash inicial
✅ HistoryScreen.tsx               - Histórico de conversas
✅ AudioMessageCard.tsx            - Card de mensagem com áudio
✅ PlayButton.tsx                  - Botão de play para áudio
✅ SpectrumAnalyzer.tsx            - Analisador de espectro de frequência
✅ SlidingMicrophone.tsx           - Microfone deslizante
✅ ToggleMicrophoneButton.tsx      - Toggle de microfone
✅ UnifiedFooter.tsx               - Rodapé unificado
✅ UnifiedHeader.tsx               - Cabeçalho unificado
✅ VoicePlayerBox.tsx              - Player de voz
✅ ModuleSelector.tsx              - Seletor de módulos
✅ ConversationDrawer.tsx          - Drawer de conversas
```

#### `/components/pwa/voice/_legacy/`

```
⚠️  FooterModules.tsx               - Footer com navegação de módulos (usado)
⚠️  HeaderActions.tsx               - Ações do header (verificar se usado)
⚠️  MicrophoneButton.tsx            - Botão de microfone legado
⚠️  MicrophoneOrb.tsx               - Orb de microfone animado
⚠️  ... (outros legados - avaliar necessidade)
```

#### `/components/pwa/modules/`

```
✅ UnifiedModuleLayout.tsx         - Layout unificado para módulos
✅ HealthModule.tsx                - Módulo de saúde (OLDCARTS)
✅ HelpModule.tsx                  - Módulo de ajuda
✅ WorldModule.tsx                 - Módulo de conhecimento geral
✅ IdeasModule.tsx                 - Módulo de validação de ideias
```

#### `/components/pwa/containers/`

```
✅ HomeContainer.tsx               - Container do módulo HOME
✅ HealthModuleContainer.tsx       - Container do módulo HEALTH
✅ HelpModuleContainer.tsx         - Container do módulo HELP
✅ WorldModuleContainer.tsx        - Container do módulo WORLD
✅ IdeasModuleContainer.tsx        - Container do módulo IDEAS
✅ index.ts                        - Export barrel
```

#### `/components/pwa/history/`

```
✅ MessageCard.tsx                 - Card de mensagem no histórico
✅ DateSeparator.tsx               - Separador de datas
✅ index.ts                        - Export barrel
```

#### `/components/pwa/microphone/`

```
✅ RecordingIndicator.tsx          - Indicador de gravação
✅ index.ts                        - Export barrel
```

#### `/components/pwa/microservices/`

```
✅ HomePlayButton.tsx              - Botão de play com glow rotativo
✅ index.ts                        - Export barrel
```

#### `/components/pwa/` (raiz)

```
✅ MobileFrame.tsx                 - Frame mobile para visualização desktop
✅ SafariAudioUnlock.tsx           - Unlock de áudio no Safari/iOS
✅ SafariPWAInstallPrompt.tsx      - Prompt de instalação para Safari
✅ VoiceSpectrum.tsx               - Spectrum de voz animado
✅ types.ts                        - Types do PWA
✅ index.ts                        - Export barrel
```

### 3.2. Gates de Autenticação

```
✅ /components/gates/PWAAuthGate.tsx        - Gate de autenticação PWA v4.1
✅ /components/gates/DeviceGate.tsx         - Gate de detecção mobile/desktop
```

### 3.3. Componentes UI (Shadcn-ui)

**Necessários:**

```
✅ /components/ui/button.tsx
✅ /components/ui/input.tsx
✅ /components/ui/input-otp.tsx            - Input de OTP (verificação)
✅ /components/ui/card.tsx
✅ /components/ui/toast.tsx
✅ /components/ui/toaster.tsx
✅ /components/ui/sonner.tsx
✅ /components/ui/dialog.tsx
✅ /components/ui/drawer.tsx
✅ /components/ui/scroll-area.tsx
✅ /components/ui/separator.tsx
✅ /components/ui/badge.tsx
✅ /components/ui/avatar.tsx
✅ /components/ui/skeleton.tsx
✅ /components/ui/progress.tsx
```

**Opcionais (caso necessário):**

```
⚠️  /components/ui/dropdown-menu.tsx
⚠️  /components/ui/popover.tsx
⚠️  /components/ui/select.tsx
⚠️  /components/ui/textarea.tsx
```

---

## 4. Hooks Personalizados

### 4.1. Hooks PWA Essenciais

```
✅ /hooks/usePWAAuth.ts                     - Autenticação PWA v7.0
✅ /hooks/useConfigPWA.ts                   - Configurações do PWA
✅ /hooks/usePWAConversations.ts            - Gerenciamento de conversas v1.1.0
✅ /hooks/useDeviceFingerprint.ts           - Geração de fingerprint
✅ /hooks/useDeviceDetection.ts             - Detecção mobile/desktop
✅ /hooks/useDeviceFingerprintAdapter.ts    - Adapter de fingerprint
```

### 4.2. Hooks de Áudio e Voz

```
⚠️  /hooks/useAudioRecorder.ts              - Gravação de áudio (verificar necessidade)
⚠️  /hooks/useTextToSpeech.ts               - Text-to-Speech (verificar necessidade)
⚠️  /hooks/useVoiceRecognition.ts           - Speech-to-Text (verificar necessidade)
⚠️  /hooks/useMicrophonePermission.ts       - Permissão de microfone
```

### 4.3. Hooks Utilitários

```
✅ /hooks/use-toast.ts                      - Hook de toast (Shadcn)
✅ /hooks/use-mobile.ts                     - Hook de detecção mobile
```

---

## 5. Stores (Zustand)

### 5.1. Stores Essenciais

```
✅ /stores/pwaVoiceStore.ts                 - Store principal do PWA
✅ /stores/historyStore.ts                  - Store de histórico v2.1.0
✅ /stores/audioManagerStore.ts             - Store de gerenciamento de áudio v3.0.0
```

**Estado gerenciado:**

#### pwaVoiceStore.ts
- Autenticação (deviceFingerprint, userId, userName)
- Estado da app (appState, activeModule)
- Player (playerState, isPlaying, audioProgress)
- Microfone (micState, isListening, transcript)
- Conversações
- Módulos específicos (healthAnswers, ideaContent)

#### historyStore.ts
- Mensagens por módulo (home, help, world, health, ideas)
- Sincronização com Supabase
- Device ID para persistência

#### audioManagerStore.ts
- Áudio global (apenas 1 áudio tocando por vez)
- Web Audio API para visualização de frequência
- Safari/iOS optimizations

---

## 6. Utilitários e Bibliotecas

### 6.1. Utilitários Safari/iOS

```
✅ /utils/safari-audio.ts                   - Utilitários de áudio para Safari
✅ /utils/safari-detect.ts                  - Detecção de Safari/iOS
```

**Funções principais:**
- `getAudioContext()` - Criar AudioContext com webkit prefix
- `unlockAudio()` - Desbloquear áudio no Safari
- `isAudioUnlocked()` - Verificar se áudio está desbloqueado
- `createOptimizedAudioElement()` - Criar elemento audio otimizado
- `getBrowserInfo()` - Detectar Safari/iOS

### 6.2. Bibliotecas de Segurança

```
⚠️  /lib/security-shield.ts                 - Security Shield v5 (avaliar necessidade)
```

**Funções principais:**
- `initSecurityShield()` - Inicializar proteção
- `checkBanStatus()` - Verificar ban
- `getDeviceFingerprint()` - Gerar fingerprint

**Nota:** Avaliar se a proteção completa é necessária no PWA ou se apenas o fingerprint básico é suficiente.

### 6.3. Cliente Supabase

```
✅ /integrations/supabase/client.ts         - Cliente Supabase
✅ /integrations/supabase/types.ts          - Types gerados do Supabase
```

---

## 7. Dependências npm

### 7.1. Dependências Essenciais

```json
{
  "dependencies": {
    // Core
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",

    // Estado
    "zustand": "^5.0.9",
    "@tanstack/react-query": "^5.83.0",

    // UI Framework
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",

    // Radix UI (Shadcn-ui components)
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-progress": "^1.1.7",

    // Animações
    "framer-motion": "^12.23.26",

    // Ícones
    "lucide-react": "^0.462.0",

    // Backend
    "@supabase/supabase-js": "^2.84.0",

    // Forms & Validation
    "react-hook-form": "^7.61.1",
    "zod": "^3.25.76",
    "@hookform/resolvers": "^3.10.0",

    // Input especial
    "input-otp": "^1.4.2",

    // Toast
    "sonner": "^1.7.4",

    // Utilidades
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@types/node": "^22.16.5",
    "@vitejs/plugin-react-swc": "^3.11.0",
    "typescript": "^5.8.3",
    "vite": "^5.4.19",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "eslint": "^9.32.0"
  }
}
```

### 7.2. Dependências Removidas (não necessárias no PWA)

```
❌ html2canvas, jspdf, jspdf-autotable      - Export de documentos (admin only)
❌ xlsx, papaparse                          - Processamento de planilhas (admin only)
❌ recharts                                 - Gráficos (admin only)
❌ mermaid                                  - Diagramas (admin only)
❌ react-simple-maps, topojson-client       - Mapas (admin only)
❌ regression, simple-statistics            - Análise estatística (admin only)
❌ qrcode, qrcode.react                     - QR Code (admin only)
❌ react-dropzone                           - Upload de arquivos (admin only)
❌ @dnd-kit/*                               - Drag and drop (admin only)
❌ next-themes                              - Theme switcher (PWA é sempre dark)
```

---

## 8. Edge Functions (Supabase)

### 8.1. Functions Essenciais para PWA

```
✅ chat-router/                             - Roteamento de chat para LLMs
✅ text-to-speech/                          - Conversão de texto para áudio
✅ voice-to-text/                           - Conversão de voz para texto
✅ send-sms/                                - Envio de SMS (verificação)
✅ send-whatsapp/                           - Envio de WhatsApp (alternativa)
✅ pwa-save-message/                        - Salvar mensagens do PWA
✅ pwa-get-history/                         - Buscar histórico de mensagens
✅ pwa-contextual-memory/                   - Gerenciar memória contextual
✅ generate-contextual-greeting/            - Gerar saudações personalizadas
✅ check-ban-status/                        - Verificar ban de dispositivo
✅ report-security-violation/               - Reportar violações
```

### 8.2. Functions Opcionais (avaliar necessidade)

```
⚠️  send-pwa-verification/                  - Envio de código de verificação (alternativa)
⚠️  send-pwa-verification-direct/           - Envio direto de verificação
⚠️  send-pwa-notification/                  - Notificações PWA
⚠️  generate-conversation-summary/          - Resumo de conversas
⚠️  sentiment-alert/                        - Alertas de sentimento
```

### 8.3. Functions Removidas (Admin only)

```
❌ deep-search/                             - Busca RAG (admin only)
❌ process-document-v2/                     - Processamento de documentos
❌ generate-image/                          - Geração de imagens
❌ ... (todas as outras functions de admin)
```

---

## 9. Tabelas do Banco de Dados

### 9.1. Tabelas Essenciais PWA

```sql
✅ pwa_config                               -- Configurações do PWA
   - id, config_key, config_value, created_at, updated_at

✅ pwa_sessions                             -- Sessões de usuários
   - id, device_id, phone, user_name, session_token, created_at, expires_at, is_verified

✅ pwa_messages                             -- Mensagens do PWA
   - id, session_id, role, content, audio_url, agent_slug, created_at

✅ pwa_user_devices                         -- Dispositivos registrados
   - id, device_id, phone, device_info, created_at, last_seen, is_verified

✅ pwa_conversation_sessions                -- Sessões de conversação
   - id, device_id, user_name, company, module_type, started_at, ended_at

✅ pwa_conversation_messages                -- Mensagens das conversações
   - id, session_id, role, content, audio_url, timestamp, key_topics

✅ pwa_conv_summaries                       -- Resumos de conversações
   - id, session_id, summary, key_topics, created_at
```

### 9.2. Tabelas de Segurança

```sql
✅ security_bans                            -- Dispositivos/IPs banidos
   - id, ban_type, identifier, reason, created_at, expires_at

✅ device_fingerprints                      -- Logs de fingerprints
   - id, device_id, fingerprint_data, user_agent, created_at
```

### 9.3. Tabelas de Autenticação/Convites

```sql
✅ user_invitations (ou pwa_invites)        -- Convites de acesso
   - id, phone, user_name, verification_code, code_expires_at, status, created_at

⚠️  Verificar qual tabela é usada: user_invitations ou pwa_invites
```

### 9.4. Tabelas Removidas (Admin only)

```
❌ documents                                -- Documentos (admin)
❌ document_chunks                          -- Chunks de documentos (admin)
❌ global_taxonomy                          -- Taxonomia (admin)
❌ chat_history                             -- Chat desktop (admin)
❌ ... (todas as outras tabelas de admin)
```

---

## 10. RPC Functions

### 10.1. Functions Essenciais

```sql
✅ check_pwa_access(p_phone TEXT)
   -- Verifica se usuário tem acesso ao PWA
   -- Retorna: { has_access, user_name, expires_at }

✅ login_pwa(p_phone TEXT)
   -- Inicia processo de login
   -- Retorna: { success, verification_code, user_name, phone, already_verified }

✅ verify_pwa_code(p_phone TEXT, p_code TEXT)
   -- Verifica código de verificação
   -- Retorna: { success, user_name, expires_at, error }

✅ get_pwa_users_aggregated(...)
   -- Busca usuários PWA agregados (admin dashboard - avaliar necessidade)
```

### 10.2. Functions Removidas (Admin only)

```
❌ Todas as functions de administração de documentos, taxonomia, etc.
```

---

## 11. Configurações

### 11.1. Vite Config

```typescript
// vite.config.ts
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

### 11.2. Tailwind Config

```javascript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Configurações do tema
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### 11.3. TypeScript Config

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 11.4. Environment Variables

```env
# .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 12. Rotas

### 12.1. Rotas PWA

```typescript
// App.tsx (simplificado para PWA)
<Routes>
  <Route path="/" element={<PWAVoiceAssistant />} />
  <Route path="/pwa" element={<PWAVoiceAssistant />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

**Nota:** O PWA é uma single-page app. Remover todas as rotas de admin, dashboard, etc.

---

## 13. Assets e Estilos

### 13.1. Global CSS

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* PWA-specific styles */
  .pwa-scroll-lock {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
  }

  .pwa-no-select {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .pwa-fullscreen {
    width: 100vw;
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height for mobile */
  }
}
```

### 13.2. PWA Manifest

```json
// public/manifest.json
{
  "name": "KnowYOU Voice Assistant",
  "short_name": "KnowYOU",
  "description": "IA na Saúde | Revolução do Reskilling",
  "start_url": "/pwa",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 13.3. index.html

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />

    <!-- PWA Meta Tags -->
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

---

## 14. Checklist de Migração

### Fase 1: Setup Inicial

```
☐ Criar novo repositório knowyou-pwa
☐ Inicializar projeto Vite + React + TypeScript
☐ Configurar Tailwind CSS
☐ Configurar path alias (@/)
☐ Configurar ESLint e Prettier
```

### Fase 2: Componentes UI Base

```
☐ Copiar /components/ui/ (Shadcn-ui)
☐ Copiar hooks de UI (use-toast, use-mobile)
☐ Configurar Toaster e Sonner
☐ Testar componentes base
```

### Fase 3: Stores e Estado

```
☐ Copiar /stores/pwaVoiceStore.ts
☐ Copiar /stores/historyStore.ts
☐ Copiar /stores/audioManagerStore.ts
☐ Testar stores individualmente
```

### Fase 4: Utilitários e Libs

```
☐ Copiar /utils/safari-audio.ts
☐ Copiar /utils/safari-detect.ts
☐ Copiar /lib/security-shield.ts (simplificado)
☐ Copiar /integrations/supabase/client.ts
☐ Configurar variáveis de ambiente
```

### Fase 5: Hooks PWA

```
☐ Copiar /hooks/usePWAAuth.ts
☐ Copiar /hooks/useConfigPWA.ts
☐ Copiar /hooks/usePWAConversations.ts
☐ Copiar /hooks/useDeviceFingerprint.ts
☐ Copiar /hooks/useDeviceDetection.ts
☐ Testar hooks individualmente
```

### Fase 6: Componentes PWA

```
☐ Copiar /components/pwa/ (todos)
☐ Copiar /components/gates/ (PWAAuthGate, DeviceGate)
☐ Resolver imports quebrados
☐ Testar componentes isoladamente
```

### Fase 7: Supabase Backend

```
☐ Criar projeto Supabase
☐ Executar migrations para tabelas PWA
☐ Criar RPC functions (check_pwa_access, login_pwa, verify_pwa_code)
☐ Copiar Edge Functions necessárias
☐ Testar Edge Functions
```

### Fase 8: Rotas e App

```
☐ Configurar rotas no App.tsx
☐ Configurar PWA manifest
☐ Configurar index.html
☐ Testar navegação
```

### Fase 9: Testes

```
☐ Testar autenticação (login + verificação)
☐ Testar cada módulo (HOME, HELP, WORLD, HEALTH, IDEAS)
☐ Testar áudio (play, pause, spectrum)
☐ Testar histórico de mensagens
☐ Testar em Safari/iOS
☐ Testar em Chrome/Android
☐ Testar device fingerprinting
☐ Testar offline (se aplicável)
```

### Fase 10: Otimizações

```
☐ Configurar PWA service worker (se necessário)
☐ Otimizar bundle size
☐ Configurar lazy loading
☐ Otimizar assets (imagens, ícones)
☐ Configurar cache de áudio
```

### Fase 11: Deploy

```
☐ Configurar CI/CD
☐ Deploy em staging
☐ Testes em staging
☐ Deploy em produção
☐ Configurar domínio (pwa.knowyou.app)
```

---

## 15. Notas Importantes

### 15.1. Safari/iOS Considerations

O projeto tem otimizações específicas para Safari/iOS:

- **Audio unlock** antes de tocar qualquer áudio
- **Web Audio API** com webkit prefix
- **PWA install prompt** customizado para Safari
- **viewport-fit=cover** para suporte a notch/safe areas
- **Audio element** criado via JavaScript (não HTML5 tag)

### 15.2. Security

O PWA usa device fingerprinting para:

- Identificação única de dispositivos
- Controle de acesso
- Ban de dispositivos maliciosos
- Rastreamento de sessões

**Implementação:** Canvas + WebGL + Browser fingerprinting

### 15.3. Autenticação

A autenticação é feita por **telefone + SMS OTP**:

1. Usuário digita telefone
2. Sistema gera código de 6 dígitos
3. Código enviado via SMS (Twilio)
4. Código válido por 10 minutos
5. Após verificação, telefone salvo em localStorage
6. Sessão persiste até logout ou expiração

**Sem senha!** Apenas telefone verificado.

### 15.4. Módulos Isolados

Cada módulo (HOME, HELP, WORLD, HEALTH, IDEAS) é **completamente isolado**:

- Histórico de mensagens separado
- Contexto de conversa separado
- Audio player independente
- Cleanup ao mudar de módulo

**Isso evita:** Vazamento de contexto entre módulos, conflitos de estado, race conditions de áudio.

---

## 16. Contatos e Suporte

- **Projeto Original:** knowyou-production
- **Novo Projeto:** knowyou-pwa
- **Documentação:** Este arquivo
- **Versão:** 1.0 (2026-01-16)

---

**Fim do Guia de Extração**
