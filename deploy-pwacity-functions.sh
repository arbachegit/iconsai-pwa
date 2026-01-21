#!/bin/bash

# ============================================
# PWA City - Deploy Edge Functions
# ============================================

echo "🏙️  PWA City - Deploy Edge Functions"
echo "===================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado!"
    echo "   Instale com: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Check if user is logged in
echo "🔐 Verificando autenticação..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Você não está logado no Supabase"
    echo "   Execute: supabase login"
    exit 1
fi

echo "✅ Autenticado no Supabase"
echo ""

# Deploy functions
echo "📦 Deploying pwacity-openai..."
if supabase functions deploy pwacity-openai; then
    echo "✅ pwacity-openai deployed"
else
    echo "❌ Erro ao fazer deploy de pwacity-openai"
    exit 1
fi

echo ""
echo "📦 Deploying pwacity-gemini..."
if supabase functions deploy pwacity-gemini; then
    echo "✅ pwacity-gemini deployed"
else
    echo "❌ Erro ao fazer deploy de pwacity-gemini"
    exit 1
fi

echo ""
echo "===================================="
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "🧪 Testar funções:"
echo "   supabase functions invoke pwacity-openai --body '{\"prompt\":\"Olá\"}'"
echo "   supabase functions invoke pwacity-gemini --body '{\"prompt\":\"Olá\"}'"
echo ""
echo "📝 Nota: As funções estão em modo MOCK"
echo "   Edite os arquivos para conectar com suas APIs reais"
echo "===================================="
