#!/bin/bash
# ============================================================
# SETUP SCRIPT - ICONSAI-PWA SERVER (DigitalOcean Ubuntu 24.04)
# ============================================================
# Execute como root no novo droplet:
# curl -fsSL https://raw.githubusercontent.com/arbachegit/iconsai-pwa/main/scripts/setup-server.sh | bash
# ============================================================

set -e

echo "========================================"
echo "  ICONSAI-PWA Server Setup"
echo "========================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis de configuração
DOMAIN="pwa.iconsai.io"
APP_DIR="/var/www/iconsai-pwa"
REPO_URL="https://github.com/arbachegit/iconsai-pwa.git"
NODE_VERSION="20"

echo -e "${YELLOW}[1/7] Atualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/7] Instalando dependências básicas...${NC}"
apt install -y curl git nginx certbot python3-certbot-nginx ufw

echo -e "${YELLOW}[3/7] Instalando Node.js ${NODE_VERSION}...${NC}"
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

echo -e "${GREEN}Node.js version: $(node -v)${NC}"
echo -e "${GREEN}npm version: $(npm -v)${NC}"

echo -e "${YELLOW}[4/7] Configurando firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo -e "${YELLOW}[5/7] Criando diretório da aplicação...${NC}"
mkdir -p ${APP_DIR}/repo
cd ${APP_DIR}
git clone ${REPO_URL} repo
cd repo

echo -e "${YELLOW}[6/7] Instalando dependências e fazendo build...${NC}"
npm install
NODE_OPTIONS="--max-old-space-size=1024" npm run build

echo -e "${YELLOW}[7/7] Configurando Nginx...${NC}"
cat > /etc/nginx/sites-available/iconsai-pwa << 'NGINX_CONF'
server {
    listen 80;
    server_name pwa.iconsai.io;
    root /var/www/iconsai-pwa/repo/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/x-javascript application/xml application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX_CONF

# Habilitar site
ln -sf /etc/nginx/sites-available/iconsai-pwa /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar nginx
nginx -t && systemctl restart nginx

echo ""
echo "========================================"
echo -e "${GREEN}  Setup básico completo!${NC}"
echo "========================================"
echo ""
echo "Próximos passos MANUAIS:"
echo ""
echo "1. Configure o DNS:"
echo "   Adicione um registro A apontando:"
echo "   ${DOMAIN} → [IP deste servidor]"
echo ""
echo "2. Depois que o DNS propagar, execute:"
echo "   certbot --nginx -d ${DOMAIN}"
echo ""
echo "3. Configure os GitHub Secrets no repositório:"
echo "   - SERVER_HOST: [IP deste servidor]"
echo "   - SERVER_USER: root"
echo "   - SSH_PRIVATE_KEY: [sua chave privada SSH]"
echo ""
echo "4. Crie o arquivo .env na pasta da aplicação:"
echo "   nano ${APP_DIR}/repo/.env"
echo ""
echo "========================================"
