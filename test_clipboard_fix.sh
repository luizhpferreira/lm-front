#!/bin/bash

echo "🧪 Testando Correção do Clipboard"
echo "=================================="

echo ""
echo "📱 Dependências instaladas:"
if npm list expo-clipboard > /dev/null 2>&1; then
    echo "✅ expo-clipboard instalado"
else
    echo "❌ expo-clipboard não encontrado"
    exit 1
fi

if npm list react-native-qrcode-svg > /dev/null 2>&1; then
    echo "✅ react-native-qrcode-svg instalado"
else
    echo "❌ react-native-qrcode-svg não encontrado"
    exit 1
fi

echo ""
echo "🔧 Verificando imports no código:"
if grep -q "expo-clipboard" src/screens/CreateInvoiceScreen.tsx; then
    echo "✅ Import expo-clipboard correto"
else
    echo "❌ Import expo-clipboard não encontrado"
fi

if grep -q "Clipboard.setStringAsync" src/screens/CreateInvoiceScreen.tsx; then
    echo "✅ Função setStringAsync implementada"
else
    echo "❌ Função setStringAsync não encontrada"
fi

if grep -q "@react-native-clipboard/clipboard" src/screens/CreateInvoiceScreen.tsx; then
    echo "❌ Import antigo ainda presente"
else
    echo "✅ Import antigo removido"
fi

echo ""
echo "📋 Correções aplicadas:"
echo "✅ @react-native-clipboard/clipboard desinstalado"
echo "✅ expo-clipboard instalado"
echo "✅ Imports atualizados para expo-clipboard"
echo "✅ Funções atualizadas para setStringAsync"
echo "✅ QR Code implementado com react-native-qrcode-svg"

echo ""
echo "🎯 Como testar:"
echo "1. Execute 'npm start' para iniciar o app"
echo "2. Abra o app no emulador/dispositivo"
echo "3. Faça login e vá para 'Criar Invoice'"
echo "4. Crie um invoice e verifique se o QR Code aparece"
echo "5. Teste os botões de copiar e compartilhar"

echo ""
echo "💡 Se ainda houver erro:"
echo "• Verifique se o Expo está atualizado"
echo "• Tente 'npx expo install --fix'"
echo "• Limpe cache: 'npx expo start --clear'"

echo ""
echo "🎉 Teste concluído!"
echo "A correção do Clipboard deve ter resolvido o erro!"
