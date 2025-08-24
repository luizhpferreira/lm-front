#!/bin/bash

echo "🧪 Testando funcionalidade de Preferências"
echo "=========================================="

# Verificar se os arquivos foram criados
echo "📁 Verificando arquivos criados:"

if [ -f "src/screens/PreferencesScreen.tsx" ]; then
    echo "✅ PreferencesScreen.tsx criado com sucesso"
else
    echo "❌ PreferencesScreen.tsx não encontrado"
fi

# Verificar se a navegação foi atualizada
echo ""
echo "🧭 Verificando navegação:"

if grep -q "PreferencesScreen" src/navigation/AppNavigator.tsx; then
    echo "✅ PreferencesScreen adicionada à navegação"
else
    echo "❌ PreferencesScreen não encontrada na navegação"
fi

if grep -q "Preferences" src/navigation/AppNavigator.tsx; then
    echo "✅ Rota Preferences adicionada"
else
    echo "❌ Rota Preferences não encontrada"
fi

# Verificar se a HomeScreen foi atualizada
echo ""
echo "🏠 Verificando HomeScreen:"

if grep -q "preferencesButton" src/screens/HomeScreen.tsx; then
    echo "✅ Botão de preferências adicionado à HomeScreen"
else
    echo "❌ Botão de preferências não encontrado"
fi

if grep -q "navigation.navigate('Preferences')" src/screens/HomeScreen.tsx; then
    echo "✅ Navegação para preferências implementada"
else
    echo "❌ Navegação para preferências não encontrada"
fi

# Verificar se o botão de logout foi removido da HomeScreen
if ! grep -q "handleLogout" src/screens/HomeScreen.tsx; then
    echo "✅ Função handleLogout removida da HomeScreen"
else
    echo "❌ Função handleLogout ainda presente na HomeScreen"
fi

# Verificar funcionalidade de logout na tela de preferências
echo ""
echo "🚪 Verificando funcionalidade de logout:"

if grep -q "Encerrar Sessão" src/screens/PreferencesScreen.tsx; then
    echo "✅ Opção 'Encerrar Sessão' implementada"
else
    echo "❌ Opção 'Encerrar Sessão' não encontrada"
fi

if grep -q "handleLogout" src/screens/PreferencesScreen.tsx; then
    echo "✅ Função handleLogout implementada na tela de preferências"
else
    echo "❌ Função handleLogout não encontrada"
fi

echo ""
echo "🎉 Teste concluído!"
echo ""
echo "📋 Resumo das funcionalidades implementadas:"
echo "   • Nova tela de Preferências criada"
echo "   • Botão de configurações (⚙️) adicionado ao header da HomeScreen"
echo "   • Informações da conta e carteira movidas para preferências"
echo "   • Opção 'Encerrar Sessão' como última opção na tela de preferências"
echo "   • Navegação entre telas configurada"
echo "   • Botão de logout removido da HomeScreen"
echo "   • HomeScreen simplificada com foco nas ações principais"
echo ""
echo "🚀 Para testar o aplicativo:"
echo "   1. Execute: npm start"
echo "   2. Abra o app no seu dispositivo/emulador"
echo "   3. Faça login"
echo "   4. Toque no ícone ⚙️ no header"
echo "   5. Teste a opção 'Encerrar Sessão'"
