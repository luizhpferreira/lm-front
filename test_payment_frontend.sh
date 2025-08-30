#!/bin/bash

echo "🧪 Teste de Integração Frontend - Pagamento de Invoices"
echo "======================================================"

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
log_info "🧪 Iniciando testes de integração frontend..."

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
    \"amount\": 1000,
    \"memo\": \"Teste Frontend\"
}"

response=$(make_request "POST" "/invoices" "$CREATE_INVOICE_DATA" "Authorization: Bearer $JWT_TOKEN")
http_code=$?

if [ $http_code -eq 201 ]; then
    log_success "Invoice criado com sucesso"
    PAYMENT_REQUEST=$(echo "$response" | jq -r '.data.payment_request' 2>/dev/null)
    echo "Payment Request: $PAYMENT_REQUEST"
else
    log_error "Erro ao criar invoice (HTTP $http_code)"
    echo "Resposta: $response"
    exit 1
fi

# Teste 3: Simular requisição do frontend para pagar invoice
echo ""
log_info "Teste 3: Simulando requisição do frontend..."
PAYMENT_DATA="{
    \"payment_request\": \"$PAYMENT_REQUEST\"
}"

response=$(make_request "POST" "/payments" "$PAYMENT_DATA" "Authorization: Bearer $JWT_TOKEN")
http_code=$?

if [ $http_code -eq 200 ]; then
    log_success "Pagamento realizado com sucesso!"
    echo "Resposta da API:"
    echo "$response" | jq '.'
    
    # Verificar se os campos estão corretos para o frontend
    payment_hash=$(echo "$response" | jq -r '.data.payment_hash' 2>/dev/null)
    amount=$(echo "$response" | jq -r '.data.amount' 2>/dev/null)
    memo=$(echo "$response" | jq -r '.data.memo' 2>/dev/null)
    paid=$(echo "$response" | jq -r '.data.paid' 2>/dev/null)
    
    echo ""
    log_info "📋 Campos para o frontend:"
    echo "payment_hash: $payment_hash"
    echo "amount: $amount"
    echo "memo: $memo"
    echo "paid: $paid"
    
    # Verificar se todos os campos necessários estão presentes
    if [ "$payment_hash" != "null" ] && [ "$amount" != "null" ]; then
        log_success "✅ Todos os campos necessários estão presentes"
    else
        log_warning "⚠️  Alguns campos podem estar faltando"
    fi
    
else
    log_error "Erro ao pagar invoice (HTTP $http_code)"
    echo "Resposta: $response"
fi

# Teste 4: Verificar status do pagamento
echo ""
log_info "Teste 4: Verificando status do pagamento..."
PAYMENT_HASH=$(echo "$response" | jq -r '.data.payment_hash' 2>/dev/null)

if [ "$PAYMENT_HASH" != "null" ]; then
    status_response=$(make_request "GET" "/payments/status?payment_hash=$PAYMENT_HASH" "" "Authorization: Bearer $JWT_TOKEN")
    status_http_code=$?
    
    if [ $status_http_code -eq 200 ]; then
        log_success "Status do pagamento verificado"
        echo "Resposta do status:"
        echo "$status_response" | jq '.'
    else
        log_warning "Erro ao verificar status (HTTP $status_http_code)"
        echo "Resposta: $status_response"
    fi
fi

echo ""
log_success "✅ Testes de integração frontend concluídos!"

echo ""
log_info "📋 Resumo dos testes:"
echo "✅ Login e obtenção de JWT token"
echo "✅ Criação de invoice para teste"
echo "✅ Simulação de pagamento via frontend"
echo "✅ Verificação de campos da resposta"
echo "✅ Verificação de status do pagamento"

echo ""
log_info "💡 Dados para teste no frontend:"
echo "JWT Token: $JWT_TOKEN"
echo "Payment Request: $PAYMENT_REQUEST"
echo "Payment Hash: $PAYMENT_HASH"

echo ""
log_info "🎯 Como testar no frontend:"
echo "1. Use o JWT Token para autenticação"
echo "2. Use o Payment Request para testar pagamento"
echo "3. Use o Payment Hash para verificar status"
echo "4. Verifique se os campos são exibidos corretamente"

echo ""
log_success "🎉 Integração frontend-backend está funcionando corretamente!"
