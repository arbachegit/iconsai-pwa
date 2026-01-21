# 🏥 PWA Health - Knowyou AI Saúde

## 📋 Visão Geral

O **PWA Health** (Knowyou AI Saúde) é um microserviço independente focado exclusivamente em **triagem médica por voz**. É o terceiro PWA da família KnowYOU, juntando-se ao PWA Principal e ao PWA City.

### Características Principais

- ✅ **Microserviço Independente**: Totalmente separado dos outros PWAs
- 🎤 **Interface de Voz**: Interação 100% por voz
- 🏥 **Foco em Saúde**: Dedicado à triagem médica (protocolo OLDCARTS)
- 📱 **Mobile-First**: Otimizado para dispositivos móveis
- 🔒 **Autenticação Própria**: Sistema de convites e OTP independente
- 🌐 **URL Exclusiva**: `pwa.iconsai.ai/health`

---

## 🏗️ Arquitetura

### Estrutura de Arquivos

```
src/
├── components/
│   ├── gates/
│   │   ├── PWAHealthAuthGate.tsx          # Gate de autenticação
│   │   ├── PWAHealthDeviceGate.tsx        # Controle mobile/desktop
│   │   └── PWAHealthDesktopBlock.tsx      # Bloqueio desktop
│   └── pwahealth/
│       └── PWAHealthContainer.tsx         # Container principal
├── hooks/
│   └── usePWAHealthAuth.ts                # Hook de autenticação
└── pages/
    └── PWAHealthPage.tsx                  # Página raiz

supabase/
└── migrations/
    └── 20260117_create_pwahealth_tables.sql  # Migration do banco
```

### Fluxo de Componentes

```
PWAHealthPage (Raiz)
    └─ PWAHealthDeviceGate (Controle de dispositivo)
        └─ PWAHealthAuthGate (Autenticação)
            └─ PWAHealthContainer (Aplicação principal)
                ├─ Header (Nome do usuário + Logout)
                ├─ SpectrumAnalyzer (Visualização de frequência)
                ├─ PlayButton (Reproduzir áudio)
                └─ ToggleMicrophoneButton (Gravação de voz)
```

---

## 🗄️ Banco de Dados

### Tabelas Criadas

#### 1. `pwahealth_config`
Configurações específicas do PWA Health.

```sql
- config_key (TEXT, UNIQUE)
- config_value (TEXT)
- config_type (TEXT) -- text, number, boolean
- description (TEXT)
```

**Configurações Padrão:**
- `welcome_text`: Texto de boas-vindas
- `tts_voice`: ID da voz ElevenLabs
- `voice_stability`, `voice_similarity`, `voice_style`, `voice_speed`
- `oldcarts_protocol`: Habilitar protocolo OLDCARTS
- `emergency_keywords`: Keywords de emergência (JSON)
- `severity_thresholds`: Níveis de severidade (JSON)

#### 2. `pwahealth_invites`
Sistema de convites para acesso.

```sql
- invite_code (TEXT, UNIQUE)
- name (TEXT)
- phone (TEXT)
- email (TEXT, opcional)
- status (TEXT) -- pending, accepted, expired
- expires_at (TIMESTAMP)
```

#### 3. `pwahealth_sessions`
Sessões de autenticação (telefone + OTP).

```sql
- phone (TEXT)
- verification_code (TEXT)
- code_expires_at (TIMESTAMP) -- 10 minutos
- failed_attempts (INTEGER) -- máximo 5
- is_verified (BOOLEAN)
```

#### 4. `pwahealth_conversations`
Histórico de conversas médicas.

```sql
- phone (TEXT)
- session_id (UUID)
- prompt (TEXT) -- pergunta do usuário
- response (TEXT) -- resposta da IA
- api_provider (TEXT) -- openai, gemini
- medical_context (JSONB) -- contexto OLDCARTS
- severity_level (TEXT) -- low, medium, high, urgent
- symptoms (TEXT[]) -- array de sintomas
```

### Funções RPC

#### `login_pwahealth(p_phone TEXT)`
Inicia o processo de login.
- Verifica convite válido
- Gera código OTP (6 dígitos)
- Cria sessão com validade de 10 minutos

#### `verify_pwahealth_code(p_phone TEXT, p_code TEXT)`
Verifica o código OTP.
- Valida código e expiração
- Marca convite como aceito
- Ativa sessão verificada

#### `check_pwahealth_access(p_phone TEXT)`
Verifica se usuário tem acesso ativo.
- Consulta convite aceito
- Verifica sessão ativa
- Atualiza última atividade

---

## 🔐 Sistema de Autenticação

### Fluxo de Login

1. **Tela de Login**
   - Usuário digita telefone
   - Sistema verifica convite em `pwahealth_invites`

2. **Envio de Código**
   - Gera código OTP (6 dígitos)
   - Envia via SMS: "Knowyou AI Saude: Seu codigo de verificacao: 123456"
   - Validade: 10 minutos

3. **Verificação**
   - Usuário digita código
   - Máximo 5 tentativas
   - Se correto: marca convite como "accepted" e cria sessão

4. **Acesso Concedido**
   - Telefone salvo no localStorage: `pwahealth-verified-phone`
   - Envia SMS de boas-vindas
   - Redireciona para aplicação

### Controle de Dispositivos

#### Mobile/Tablet
- ✅ Sempre permitido (após autenticação)

#### Desktop
- ❌ Bloqueado para usuários comuns
- ✅ Admin/SuperAdmin + toggle `allow_desktop_access = true`

---

## 🎤 Funcionalidades de Voz

### Text-to-Speech (TTS)
- Provider: **ElevenLabs**
- Voz configurável via `pwahealth_config`
- Parâmetros ajustáveis: stability, similarity, style, speed

### Speech-to-Text (STT)
- Edge Function: `voice-to-text`
- Suporte iOS (audio/mp4) e outros (audio/webm)
- Validação de áudio mínimo (1KB)

### Processamento de Conversa
- Edge Function: `chat-router`
- Parâmetro: `chatType: "health"`
- Protocolo OLDCARTS para triagem médica

---

## 🚀 Como Usar

### 1. Executar Migration

```bash
# Aplicar migration do banco de dados
supabase db push
```

### 2. Criar Convites

```sql
-- Exemplo de criação de convite
INSERT INTO pwahealth_invites (invite_code, name, phone, status)
VALUES ('HEALTH2024', 'João Silva', '+5511999999999', 'pending');
```

### 3. Acessar Aplicação

```
https://pwa.iconsai.ai/health
```

### 4. Login
- Digite o telefone cadastrado
- Receba código via SMS
- Digite o código de 6 dígitos
- Acesse o assistente de saúde

---

## 📱 URLs dos PWAs

| PWA | URL | Foco |
|-----|-----|------|
| **PWA Principal** | `pwa.iconsai.ai/pwa` | Assistente geral (Home + 4 módulos) |
| **PWA City** | `pwa.iconsai.ai/city` | Chat de texto urbano |
| **PWA Health** | `pwa.iconsai.ai/health` | Triagem médica por voz |

---

## 🔄 Diferenças dos Outros PWAs

### vs PWA Principal
- ❌ Sem tela Home
- ❌ Sem navegação entre módulos
- ✅ Foco 100% em Health
- ✅ Standalone (não depende de módulos)

### vs PWA City
- ✅ Interface de voz (não texto)
- ✅ Foco médico (não urbano)
- ✅ Protocolo OLDCARTS estruturado
- ✅ Análise de severidade e sintomas

---

## 🎨 Design System

### Cores Principais

```css
/* Rose/Pink Theme */
Primary: #F43F5E (rose-500)
Accent: #EC4899 (pink-500)
Background: from-slate-950 via-slate-900 to-slate-950
```

### Ícones
- Principal: `Heart` (lucide-react)
- Secundários: `Activity`, `Phone`, `LogOut`

---

## ⚙️ Configurações

### Via Banco de Dados

```sql
-- Alterar texto de boas-vindas
UPDATE pwahealth_config
SET config_value = 'Novo texto de boas-vindas'
WHERE config_key = 'welcome_text';

-- Habilitar acesso desktop para admins
UPDATE pwahealth_config
SET config_value = 'true'
WHERE config_key = 'allow_desktop_access';

-- Configurar protocolo OLDCARTS
UPDATE pwahealth_config
SET config_value = 'true'
WHERE config_key = 'oldcarts_protocol';
```

### Protocolo OLDCARTS

O PWA Health implementa o protocolo médico **OLDCARTS** para triagem:

- **O**nset (Início dos sintomas)
- **L**ocation (Localização da dor/sintoma)
- **D**uration (Duração)
- **C**haracter (Características)
- **A**ggravating factors (Fatores agravantes)
- **R**elieving factors (Fatores que aliviam)
- **T**iming (Padrão temporal)
- **S**everity (Severidade)

---

## 📊 Monitoramento

### Verificar Conversas

```sql
-- Últimas conversas
SELECT
  phone,
  prompt,
  response,
  severity_level,
  symptoms,
  created_at
FROM pwahealth_conversations
ORDER BY created_at DESC
LIMIT 10;

-- Casos por severidade
SELECT
  severity_level,
  COUNT(*) as total
FROM pwahealth_conversations
WHERE severity_level IS NOT NULL
GROUP BY severity_level;
```

### Verificar Sessões Ativas

```sql
-- Sessões verificadas
SELECT
  phone,
  is_verified,
  last_activity,
  created_at
FROM pwahealth_sessions
WHERE is_verified = true
ORDER BY last_activity DESC;
```

---

## 🔒 Segurança

### RLS (Row Level Security)
- ✅ Habilitado em todas as tabelas
- ✅ Admins podem gerenciar convites
- ✅ Service role gerencia sessões/conversas
- ✅ Usuários não têm acesso direto ao banco

### Validações
- 📱 Verificação de telefone via OTP
- ⏱️ Códigos expiram em 10 minutos
- 🚫 Máximo 5 tentativas falhadas
- 🔐 Constraint única: 1 telefone = 1 sessão ativa

---

## 🎯 Próximos Passos

### Funcionalidades Futuras
- [ ] Histórico de conversas médicas
- [ ] Exportação de relatórios
- [ ] Integração com sistemas de saúde
- [ ] Alertas de emergência automáticos
- [ ] Dashboard administrativo específico
- [ ] Sistema de convites via interface admin

### Melhorias Técnicas
- [ ] Cache de configurações
- [ ] Otimização de áudio
- [ ] Suporte offline
- [ ] PWA Service Worker
- [ ] Analytics médicos

---

## 📝 Notas Importantes

1. **Independência Total**: O PWA Health não compartilha dados com PWA ou PWA City
2. **Compliance Médico**: Implementar conformidade LGPD/HIPAA conforme necessário
3. **Backup**: Fazer backup regular da tabela `pwahealth_conversations`
4. **Performance**: Monitorar tempos de resposta do TTS/STT
5. **Custos**: Acompanhar uso da API ElevenLabs e OpenAI

---

## 🆘 Suporte

Para problemas ou dúvidas:
- 📧 Email: suporte@knowyou.ai
- 📱 Telefone: (11) 99999-9999
- 🌐 Documentação: https://docs.knowyou.ai

---

**Versão:** 1.0.0
**Data:** 2026-01-17
**Status:** ✅ Produção
