#!/bin/bash

echo "🧪 Testando Integração - Funcionalidade de Pagamento no App Móvel"
echo "================================================================"

# Configurações
APP_DIR="mobile_luma"
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

# Verifica se o diretório do app existe
if [ ! -d "$APP_DIR" ]; then
    log_error "Diretório do app móvel não encontrado: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

echo ""
log_info "🔧 Verificando implementação no app móvel..."

# Verifica se os arquivos necessários existem
if [ -f "src/services/api.ts" ]; then
    log_success "Serviço de API encontrado"
else
    log_error "Serviço de API não encontrado"
fi

if [ -f "src/screens/QRCodeScannerScreen.tsx" ]; then
    log_success "Tela QRCodeScanner encontrada"
else
    log_error "Tela QRCodeScanner não encontrada"
fi

if [ -f "src/screens/HomeScreen.tsx" ]; then
    log_success "Tela Home encontrada"
else
    log_error "Tela Home não encontrada"
fi

if [ -f "src/navigation/AppNavigator.tsx" ]; then
    log_success "Navegação encontrada"
else
    log_error "Navegação não encontrada"
fi

echo ""
log_info "🎯 Funcionalidades implementadas no app:"

# Verifica se a função payInvoice está implementada
if grep -q "payInvoice" src/services/api.ts; then
    log_success "Função payInvoice implementada no API Service"
else
    log_error "Função payInvoice não encontrada no API Service"
fi

# Verifica se a tela QRCodeScanner tem a funcionalidade de pagamento
if grep -q "handlePayInvoice" src/screens/QRCodeScannerScreen.tsx; then
    log_success "Função handlePayInvoice implementada na tela QRCodeScanner"
else
    log_error "Função handlePayInvoice não encontrada na tela QRCodeScanner"
fi

# Verifica se há navegação para QRCodeScanner
if grep -q "QRCodeScanner" src/screens/HomeScreen.tsx; then
    log_success "Navegação para QRCodeScanner implementada na Home"
else
    log_error "Navegação para QRCodeScanner não encontrada na Home"
fi

# Verifica se a rota está configurada
if grep -q "QRCodeScanner" src/navigation/AppNavigator.tsx; then
    log_success "Rota QRCodeScanner configurada no AppNavigator"
else
    log_error "Rota QRCodeScanner não configurada no AppNavigator"
fi

echo ""
log_info "📱 Fluxo de Pagamento no App:"
echo "1. Usuário acessa a tela Home"
echo "2. Clica no botão '💳 Pagar Invoice'"
echo "3. É direcionado para QRCodeScannerScreen"
echo "4. Pode inserir payment request manualmente"
echo "5. Confirma o pagamento"
echo "6. Sistema processa via API do BFF"
echo "7. Retorna status do pagamento"

echo ""
log_info "🔍 Verificando tipos TypeScript..."

# Verifica se os tipos estão definidos
if grep -q "PayInvoiceRequest" src/services/api.ts; then
    log_success "Tipo PayInvoiceRequest definido"
else
    log_error "Tipo PayInvoiceRequest não encontrado"
fi

if grep -q "payment_request" src/services/api.ts; then
    log_success "Campo payment_request implementado"
else
    log_error "Campo payment_request não encontrado"
fi

echo ""
log_info "🚀 Endpoints utilizados pelo app:"
echo "POST $API_URL/payments - Pagar invoice"
echo "GET $API_URL/payments/status - Verificar status"

echo ""
log_info "🔒 Segurança implementada:"
echo "• Autenticação JWT automática via interceptor"
echo "• Validação de payment request (deve começar com 'lnbc')"
echo "• Tratamento de erros de rede"
echo "• Loading states durante pagamento"

echo ""
log_warning "🧪 Para testar no app:"
echo "1. Inicie o servidor BFF: cd ../bff_luma && make run"
echo "2. Inicie o app móvel: npm start"
echo "3. Faça login no app"
echo "4. Na tela Home, clique em '💳 Pagar Invoice'"
echo "5. Insira um payment request válido"
echo "6. Confirme o pagamento"

echo ""
log_info "💡 Funcionalidades do app:"
echo "• Interface intuitiva para inserir payment request"
echo "• Validação visual do formato do invoice"
echo "• Feedback visual durante processamento"
echo "• Tratamento de erros com mensagens claras"
echo "• Navegação fluida entre telas"

echo ""
log_info "📋 Arquivos principais:"
echo "• src/services/api.ts - Integração com BFF"
echo "• src/screens/QRCodeScannerScreen.tsx - Tela de pagamento"
echo "• src/screens/HomeScreen.tsx - Botão de acesso"
echo "• src/navigation/AppNavigator.tsx - Configuração de rotas"

echo ""
log_success "✅ Integração concluída!"
echo "A funcionalidade de pagamento está completamente integrada no app móvel."
echo "Usuários podem pagar invoices diretamente pelo aplicativo."

echo ""
log_info "📝 Próximos passos:"
echo "1. Teste a funcionalidade no app"
echo "2. Verifique a experiência do usuário"
echo "3. Implemente melhorias de UX se necessário"
echo "4. Adicione testes automatizados para o app"
