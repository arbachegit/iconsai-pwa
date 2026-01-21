# Deploy ICONSAI-PWA no DigitalOcean

Guia completo para configurar o deploy do iconsai-pwa em um droplet DigitalOcean.

## Visão Geral

| Item | Valor |
|------|-------|
| Domínio | pwa.iconsai.io |
| Servidor | Novo droplet DigitalOcean |
| Pasta no servidor | /var/www/iconsai-pwa/repo |
| Build output | /var/www/iconsai-pwa/repo/dist |
| Repositório | https://github.com/arbachegit/iconsai-pwa |

---

## Passo 1: Criar Droplet no DigitalOcean

### Acesse o Console DigitalOcean
1. Vá para https://cloud.digitalocean.com
2. Clique em **Create** → **Droplets**

### Configurações Recomendadas
- **Region**: NYC1 ou mais próxima
- **Image**: Ubuntu 24.04 (LTS) x64
- **Size**: Basic → Regular → $6/mês (1GB RAM, 1 vCPU, 25GB SSD)
- **Authentication**: SSH Key (recomendado) ou Password
- **Hostname**: iconsai-pwa

### Adicionar SSH Key (se ainda não tiver)
No seu terminal local:
```bash
# Gerar nova chave (se não existir)
ssh-keygen -t ed25519 -C "iconsai-pwa-deploy"

# Copiar a chave pública
cat ~/.ssh/id_ed25519.pub
```
Cole a chave pública no campo "SSH Key" do DigitalOcean.

### Criar Droplet
Clique em **Create Droplet** e aguarde (1-2 minutos).

**Anote o IP do droplet!** Exemplo: `164.90.xxx.xxx`

---

## Passo 2: Configurar o Servidor

### Conectar via SSH
```bash
ssh root@SEU_IP_AQUI
```

### Executar Script de Setup
```bash
curl -fsSL https://raw.githubusercontent.com/arbachegit/iconsai-pwa/main/scripts/setup-server.sh | bash
```

Este script instalará:
- Node.js 20
- Nginx
- Git
- Certbot (Let's Encrypt)
- Firewall (UFW)

E configurará:
- Clone do repositório
- Build inicial
- Configuração do Nginx

---

## Passo 3: Configurar DNS

### No seu provedor de DNS (Cloudflare, GoDaddy, etc.)

Adicione um registro **A**:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | pwa | SEU_IP_AQUI | Auto |

Isso fará `pwa.iconsai.io` apontar para o novo droplet.

### Verificar propagação
```bash
# No terminal local
dig pwa.iconsai.io +short
# Deve retornar o IP do droplet
```

---

## Passo 4: Configurar SSL (HTTPS)

Depois que o DNS propagar (5-30 minutos), no servidor:

```bash
ssh root@SEU_IP_AQUI
certbot --nginx -d pwa.iconsai.io
```

Siga as instruções:
1. Digite seu email
2. Aceite os termos
3. Escolha redirecionar HTTP para HTTPS (opção 2)

---

## Passo 5: Configurar GitHub Secrets

### No repositório GitHub
1. Vá para https://github.com/arbachegit/iconsai-pwa/settings/secrets/actions
2. Clique em **New repository secret**

### Adicione 3 secrets:

#### SERVER_HOST
- Name: `SERVER_HOST`
- Value: `SEU_IP_AQUI` (ex: 164.90.xxx.xxx)

#### SERVER_USER
- Name: `SERVER_USER`
- Value: `root`

#### SSH_PRIVATE_KEY
- Name: `SSH_PRIVATE_KEY`
- Value: O conteúdo da sua chave privada

Para obter a chave privada (no terminal local):
```bash
cat ~/.ssh/id_ed25519
```
Copie TODO o conteúdo, incluindo:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

---

## Passo 6: Criar .env no Servidor

No servidor, crie o arquivo de variáveis de ambiente:

```bash
ssh root@SEU_IP_AQUI
nano /var/www/iconsai-pwa/repo/.env
```

Adicione as variáveis (copie do seu .env local):
```env
VITE_SUPABASE_URL=https://uhazjwqfsvxqozepyjjj.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
# ... outras variáveis
```

Salve com `Ctrl+X`, `Y`, `Enter`.

---

## Passo 7: Testar Deploy Manual

No servidor:
```bash
cd /var/www/iconsai-pwa/repo
git pull origin main
npm install
npm run build
```

Acesse https://pwa.iconsai.io para verificar.

---

## Passo 8: Testar Deploy Automático

1. Faça uma alteração no código local
2. Commit e push:
```bash
git add .
git commit -m "test: deploy automático"
git push origin main
```
3. Vá em **Actions** no GitHub para acompanhar
4. Após ~2 minutos, verifique https://pwa.iconsai.io

---

## Comandos Úteis

### No servidor
```bash
# Ver logs do nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Reiniciar nginx
systemctl restart nginx

# Rebuild manual
cd /var/www/iconsai-pwa/repo && npm run build

# Ver status dos serviços
systemctl status nginx
```

### No local
```bash
# Verificar status do deploy
gh run list --repo arbachegit/iconsai-pwa

# Ver logs do último deploy
gh run view --repo arbachegit/iconsai-pwa
```

---

## Troubleshooting

### Build falha por memória
Aumente o limite de memória do Node:
```bash
NODE_OPTIONS="--max-old-space-size=1536" npm run build
```

### Nginx 502 Bad Gateway
Verifique se o build foi feito e a pasta dist existe:
```bash
ls -la /var/www/iconsai-pwa/repo/dist
```

### SSL não funciona
Verifique se o DNS está apontando corretamente:
```bash
dig pwa.iconsai.io +short
```

### Deploy automático falha
Verifique os secrets no GitHub e teste a conexão SSH:
```bash
ssh -i ~/.ssh/id_ed25519 root@SEU_IP_AQUI
```

---

## Referência: Comparação com knowyou-production

| Item | knowyou-production | iconsai-pwa |
|------|-------------------|-------------|
| Domínio | fia.iconsai.ai | pwa.iconsai.io |
| IP | 146.190.210.29 | NOVO IP |
| Pasta | /var/www/knowyou-production/repo | /var/www/iconsai-pwa/repo |
| Supabase | Compartilhado | Compartilhado |
