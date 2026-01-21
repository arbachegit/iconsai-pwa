# KnowRisk - Migração de Banco de Dados

## Visão Geral

Este pacote contém scripts SQL completos para migrar o banco de dados KnowRisk do Lovable Cloud para outro projeto Supabase.

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `01_schema_tables.sql` | Criação de todas as tabelas, tipos e índices básicos |
| `02_functions.sql` | Funções, stored procedures e views |
| `03_rls_policies.sql` | Políticas de Row Level Security |
| `04_triggers_indexes.sql` | Triggers, índices avançados e grants |
| `05_data_export.sql` | Comandos para exportar dados do banco origem |

## Pré-requisitos

1. **Novo projeto Supabase** criado e configurado
2. **Extensões habilitadas** no novo projeto:
   - `uuid-ossp`
   - `vector` (para embeddings)
   - `pg_trgm` (para busca textual)

3. **Acesso ao banco origem** para exportar dados

## Passo a Passo

### 1. Preparar o Banco Destino

```bash
# Conectar ao banco destino
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

### 2. Executar Scripts de Schema

Execute na ordem:

```sql
\i 01_schema_tables.sql
\i 02_functions.sql
\i 03_rls_policies.sql
\i 04_triggers_indexes.sql
```

### 3. Exportar Dados do Banco Origem

Use `pg_dump` para exportar apenas dados:

```bash
pg_dump "CONNECTION_STRING_ORIGEM" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-privileges \
  --file=data_export.sql
```

### 4. Importar Dados no Destino

```bash
psql "CONNECTION_STRING_DESTINO" < data_export.sql
```

### 5. Validar Migração

Execute o script de validação em `05_data_export.sql`.

## Considerações Importantes

### Usuários e Autenticação

- A tabela `auth.users` é gerenciada pelo Supabase
- Usuários precisam se registrar novamente ou usar migração de auth
- A tabela `user_roles` referencia `auth.users`, ajuste conforme necessário

### Embeddings Vetoriais

- Chunks de documentos contêm embeddings de 1536 dimensões
- Certifique-se de que a extensão `vector` está habilitada
- Índices HNSW são criados para busca eficiente

### Secrets e API Keys

Após a migração, configure no novo projeto:

- `OPENAI_API_KEY` - Para embeddings e chat
- `ELEVENLABS_API_KEY` - Para síntese de voz
- `TWILIO_*` - Para SMS
- Outras integrações conforme necessário

### Storage

Arquivos de storage (avatares, áudios, PDFs) precisam ser migrados separadamente usando a API de Storage do Supabase.

## Tabelas Principais

| Categoria | Tabelas |
|-----------|---------|
| **Core** | `documents`, `document_chunks`, `global_taxonomy` |
| **Chat** | `chat_agents`, `conversation_history`, `chat_config` |
| **PWA** | `pwa_users`, `pwa_sessions`, `pwa_user_devices` |
| **Economia** | `economic_indicators`, `indicator_values` |
| **Usuários** | `profiles`, `user_roles`, `user_preferences` |

## Suporte

Para dúvidas sobre a migração, consulte:
- Documentação do Supabase: https://supabase.com/docs
- Documentação do projeto em `src/documentation/`

---

*Gerado em: 2026-01-13*
*Versão do Schema: 1.0*
