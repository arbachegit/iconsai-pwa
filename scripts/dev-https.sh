#!/bin/bash

# Script para rodar o servidor de desenvolvimento com HTTPS
# Isso permite que o microfone funcione em IPs locais

echo "🔐 Configurando HTTPS local para desenvolvimento..."

# Verificar se mkcert está instalado
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert não encontrado. Instalando..."
    if command -v brew &> /dev/null; then
        brew install mkcert
    else
        echo "Por favor instale mkcert manualmente:"
        echo "  - macOS: brew install mkcert"
        echo "  - Linux: apt install mkcert ou similar"
        exit 1
    fi
fi

# Instalar CA local (requer sudo)
echo "📜 Instalando certificado CA local (pode pedir senha)..."
mkcert -install

# Gerar certificados
echo "🔑 Gerando certificados para localhost e IPs locais..."
mkcert -key-file localhost-key.pem -cert-file localhost.pem \
    localhost 127.0.0.1 192.168.64.1 192.168.1.1 ::1

echo "✅ Certificados gerados!"
echo ""
echo "🚀 Iniciando servidor com HTTPS..."
echo "   Acesse: https://192.168.64.1:8080"
echo ""

# Rodar vite com HTTPS
npx vite --https
