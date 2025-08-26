#!/bin/bash

echo "📱 Instalando Luma Mobile no seu tablet"
echo "======================================"

# Verifica se o APK existe
if [ ! -f "luma-mobile.apk" ]; then
    echo "❌ APK não encontrado!"
    echo "O arquivo luma-mobile.apk deve estar no diretório atual."
    exit 1
fi

echo "✅ APK encontrado: luma-mobile.apk (65.7MB)"
echo ""

echo "📋 Instruções para instalar no tablet:"
echo ""
echo "1. 📤 Transfira o APK para o seu tablet:"
echo "   • Via cabo USB (copie o arquivo luma-mobile.apk)"
echo "   • Via email (anexe o arquivo)"
echo "   • Via Google Drive/Dropbox"
echo "   • Via ADB (se tiver root):"
echo "     adb install luma-mobile.apk"
echo ""
echo "2. 📱 No seu tablet Android:"
echo "   • Vá em Configurações > Segurança"
echo "   • Ative 'Fontes desconhecidas' ou 'Instalar apps desconhecidos'"
echo "   • Abra o arquivo luma-mobile.apk"
echo "   • Toque em 'Instalar'"
echo ""
echo "3. 🎯 Após a instalação:"
echo "   • Abra o app Luma Mobile"
echo "   • Faça login com sua conta"
echo "   • Teste a funcionalidade de QR Code"
echo ""

echo "🔧 Funcionalidades incluídas no APK:"
echo "✅ Login e registro de usuários"
echo "✅ Criação de invoices Lightning"
echo "✅ Escaneamento de QR Code"
echo "✅ Pagamento de invoices"
echo "✅ Verificação de status de pagamentos"
echo "✅ Múltiplas invoice keys"
echo "✅ Interface responsiva para tablet"
echo ""

echo "📞 Se precisar de ajuda:"
echo "• Verifique se o tablet tem Android 7.0+"
echo "• Certifique-se de que a câmera está funcionando"
echo "• Teste a conexão com internet"
echo ""

echo "🚀 APK pronto para instalação!"
echo "Arquivo: luma-mobile.apk"
echo "Tamanho: 65.7MB"
echo "Versão: 1.0.0"
