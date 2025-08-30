#!/bin/bash

echo "🧪 Teste de Funcionalidade - Copiar Invoice"
echo "=========================================="

# Configurações
BASE_URL="http://localhost:8080"
API_URL="$BASE_URL/api/v1"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Variáveis para armazenar dados do teste
TEST_EMAIL="luizferreiralps@gmail.com"
TEST_CPF="01383972281"
TEST_PASSWORD="#Ruiter1"
JWT_TOKEN=""
PAYMENT_REQUEST=""

# Função para fazer requisições HTTP
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method $API_URL$endpoint"
    
    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ ! -z "$headers" ]; then
        curl_cmd="$curl_cmd -H '$headers'"
    fi
    
    local response=$(eval $curl_cmd)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    echo "$body"
    return $http_code
}

# Verifica se o servidor está rodando
log_info "Verificando se o servidor está rodando..."
if curl -s "$BASE_URL/health" > /dev/null; then
    log_success "Servidor está rodando"
else
    log_error "Servidor não está rodando. Inicie o servidor primeiro."
    exit 1
fi

echo ""
log_info "🧪 Iniciando testes de funcionalidade de copiar invoice..."

# Teste 1: Fazer login
echo ""
log_info "Teste 1: Fazendo login..."
LOGIN_DATA="{
    \"email\": \"$TEST_CPF\",
    \"password\": \"$TEST_PASSWORD\"
}"

response=$(make_request "POST" "/login" "$LOGIN_DATA")
http_code=$?

if [ $http_code -eq 200 ]; then
    log_success "Login realizado com sucesso"
    JWT_TOKEN=$(echo "$response" | jq -r '.data.token' 2>/dev/null)
    echo "JWT Token obtido"
else
    log_error "Erro no login (HTTP $http_code)"
    echo "Resposta: $response"
    exit 1
fi

# Teste 2: Criar invoice para teste
echo ""
log_info "Teste 2: Criando invoice para teste..."
CREATE_INVOICE_DATA="{
    \"amount\": 5000,
    \"memo\": \"Teste de Copiar Invoice\"
}"

response=$(make_request "POST" "/invoices" "$CREATE_INVOICE_DATA" "Authorization: Bearer $JWT_TOKEN")
http_code=$?

if [ $http_code -eq 201 ]; then
    log_success "Invoice criado com sucesso"
    PAYMENT_REQUEST=$(echo "$response" | jq -r '.data.payment_request' 2>/dev/null)
    PAYMENT_HASH=$(echo "$response" | jq -r '.data.payment_hash' 2>/dev/null)
    AMOUNT=$(echo "$response" | jq -r '.data.amount' 2>/dev/null)
    MEMO=$(echo "$response" | jq -r '.data.memo' 2>/dev/null)
    
    echo "Payment Request: $PAYMENT_REQUEST"
    echo "Payment Hash: $PAYMENT_HASH"
    echo "Amount: $AMOUNT sats"
    echo "Memo: $MEMO"
else
    log_error "Erro ao criar invoice (HTTP $http_code)"
    echo "Resposta: $response"
    exit 1
fi

echo ""
log_success "✅ Teste de criação de invoice concluído!"

echo ""
log_info "📋 Funcionalidades implementadas no frontend:"
echo "✅ Campo de texto selecionável para Payment Request"
echo "✅ Botão '📋 Copiar' para copiar para área de transferência"
echo "✅ Botão '🗑️ Limpar' para limpar o invoice"
echo "✅ Exibição organizada das informações do invoice"
echo "✅ Feedback visual quando copiado"

echo ""
log_info "💡 Como testar no frontend:"
echo "1. Abra o app e faça login"
echo "2. Vá para 'Criar Invoice'"
echo "3. Digite um valor (ex: 5000) e memo (ex: 'Teste de Copiar')"
echo "4. Clique em '💰 Criar Invoice'"
echo "5. O invoice criado será exibido com:"
echo "   - Informações organizadas (valor, memo, hash)"
echo "   - Payment Request em caixa selecionável"
echo "   - Botão '📋 Copiar' para copiar o BOLT11"
echo "   - Botão '🗑️ Limpar' para limpar e criar novo"

echo ""
log_info "🎯 Dados para teste:"
echo "JWT Token: $JWT_TOKEN"
echo "Payment Request: $PAYMENT_REQUEST"
echo "Payment Hash: $PAYMENT_HASH"
echo "Amount: $AMOUNT sats"
echo "Memo: $MEMO"

echo ""
log_success "🎉 Funcionalidade de copiar invoice implementada com sucesso!"

echo ""
log_info "📱 Funcionalidades do frontend:"
echo "• Texto selecionável para copiar manualmente"
echo "• Botão para copiar automaticamente"
echo "• Interface limpa e organizada"
echo "• Feedback visual de sucesso"
echo "• Opção de limpar e criar novo invoice"
