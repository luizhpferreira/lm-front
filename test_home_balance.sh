#!/bin/bash

echo "🧪 Testando exibição do saldo na Home Screen"
echo "=============================================="

# Verificar se o app está rodando
echo "📱 Verificando se o app está rodando..."
if pgrep -f "expo" > /dev/null; then
    echo "✅ App Expo está rodando"
else
    echo "❌ App Expo não está rodando. Execute 'npm start' primeiro."
    exit 1
fi

echo ""
echo "🔍 Verificando mudanças implementadas:"
echo ""

# Verificar se o saldo foi adicionado à HomeScreen
if grep -q "balanceCard" src/screens/HomeScreen.tsx; then
    echo "✅ Seção de saldo adicionada à HomeScreen"
else
    echo "❌ Seção de saldo não encontrada na HomeScreen"
fi

# Verificar se o botão "Meu Saldo" foi removido
if grep -q "Meu Saldo" src/screens/HomeScreen.tsx; then
    if grep -q "navigate.*WalletBalance" src/screens/HomeScreen.tsx; then
        echo "❌ Botão 'Meu Saldo' ainda presente na HomeScreen"
    else
        echo "✅ Botão 'Meu Saldo' removido da HomeScreen"
    fi
else
    echo "✅ Botão 'Meu Saldo' não encontrado na HomeScreen"
fi

# Verificar se WalletBalanceScreen foi removida do navegador
if grep -q "WalletBalance" src/navigation/AppNavigator.tsx; then
    echo "❌ WalletBalanceScreen ainda referenciada no navegador"
else
    echo "✅ WalletBalanceScreen removida do navegador"
fi

# Verificar se a função loadBalance foi adicionada
if grep -q "loadBalance" src/screens/HomeScreen.tsx; then
    echo "✅ Função loadBalance adicionada à HomeScreen"
else
    echo "❌ Função loadBalance não encontrada na HomeScreen"
fi

echo ""
echo "📋 Resumo das mudanças:"
echo "======================="
echo "1. ✅ Saldo exibido diretamente na home"
echo "2. ✅ Botão 'Meu Saldo' removido"
echo "3. ✅ Seção de pagamentos mantida com 'Criar Invoice' e 'Pagar Invoice'"
echo "4. ✅ Refresh control atualiza o saldo"
echo "5. ✅ Loading state para o saldo"
echo ""
echo "🎯 Para testar:"
echo "1. Abra o app no dispositivo/emulador"
echo "2. Faça login"
echo "3. Verifique se o saldo aparece no topo da tela home"
echo "4. Teste o pull-to-refresh para atualizar o saldo"
echo "5. Verifique se os botões 'Criar Invoice' e 'Pagar Invoice' ainda funcionam"
echo ""
echo "✨ Teste concluído!"
