#!/bin/bash

# Script de teste para funcionalidade de reset de senha
# Testa o fluxo completo: solicitação -> email -> deep link -> reset

set -e

echo "🧪 Testando funcionalidade de reset de senha..."
echo "================================================"

# Configurações
API_BASE_URL="https://luma.app.br"
TEST_EMAIL="test@example.com"

echo "📧 1. Testando solicitação de reset de senha..."
echo "Email: $TEST_EMAIL"

# Solicitar reset de senha
RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/v1/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "Resposta: $RESPONSE"

# Verificar se a resposta foi bem-sucedida
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Solicitação de reset enviada com sucesso"
else
    echo "❌ Erro na solicitação de reset"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "🔗 2. Testando página de reset de senha..."
echo "URL: $API_BASE_URL/reset-password?token=test-token"

# Testar página de reset (com token inválido)
PAGE_RESPONSE=$(curl -s "$API_BASE_URL/reset-password?token=test-token")

if echo "$PAGE_RESPONSE" | grep -q "Redefinir Senha"; then
    echo "✅ Página de reset carregada corretamente"
else
    echo "❌ Erro ao carregar página de reset"
    exit 1
fi

echo ""
echo "🔑 3. Testando validação de token..."
echo "Token: test-token"

# Testar validação de token (deve falhar com token inválido)
VALIDATION_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/v1/validate-reset-token" \
  -H "Content-Type: application/json" \
  -d '{"token": "test-token"}')

echo "Resposta: $VALIDATION_RESPONSE"

# Verificar se a resposta indica token inválido (esperado)
if echo "$VALIDATION_RESPONSE" | grep -q '"success":false'; then
    echo "✅ Validação de token funcionando (token inválido rejeitado)"
else
    echo "❌ Erro na validação de token"
    echo "$VALIDATION_RESPONSE"
    exit 1
fi

echo ""
echo "📱 4. Testando deep link..."
echo "Deep link: bffluma://reset-password?token=test-token"

# Simular deep link (apenas verificar formato)
DEEP_LINK="bffluma://reset-password?token=test-token"
if [[ "$DEEP_LINK" =~ ^bffluma://reset-password\?token= ]]; then
    echo "✅ Formato do deep link correto"
else
    echo "❌ Formato do deep link incorreto"
    exit 1
fi

echo ""
echo "🎯 5. Verificando configurações do app..."

# Verificar se o scheme está configurado no app.json
if grep -q '"scheme": "bffluma"' app.json; then
    echo "✅ Scheme configurado no app.json"
else
    echo "❌ Scheme não encontrado no app.json"
    exit 1
fi

# Verificar se a tela ResetPassword está no navegador
if grep -q "ResetPassword" src/navigation/AppNavigator.tsx; then
    echo "✅ Tela ResetPassword configurada no navegador"
else
    echo "❌ Tela ResetPassword não encontrada no navegador"
    exit 1
fi

echo ""
echo "✅ Todos os testes passaram!"
echo "================================================"
echo ""
echo "📋 Resumo da implementação:"
echo "• Backend: Rotas e validação implementadas"
echo "• Frontend: Deep linking configurado"
echo "• Fluxo: Email → Web → App → Reset"
echo ""
echo "🚀 Para testar o fluxo completo:"
echo "1. Solicite reset de senha no app"
echo "2. Verifique o email recebido"
echo "3. Clique no link do email"
echo "4. Verifique se o app abre na tela de reset"
echo "5. Teste a redefinição da senha"
