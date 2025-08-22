#!/bin/bash

echo "🧪 Testando BFF Luma Mobile App"
echo "================================"

# Verificar se o BFF está rodando
echo "1️⃣ Verificando se o BFF está rodando..."
BFF_RESPONSE=$(curl -s http://localhost:8080/health)
if [[ $BFF_RESPONSE == *"success"* ]]; then
    echo "✅ BFF está funcionando!"
else
    echo "❌ BFF não está respondendo"
    exit 1
fi

# Verificar se o app está rodando
echo ""
echo "2️⃣ Verificando se o app está rodando..."
if pgrep -f "expo start" > /dev/null; then
    echo "✅ App está rodando!"
else
    echo "❌ App não está rodando. Execute 'npm start' primeiro."
    exit 1
fi

# Verificar estrutura de arquivos
echo ""
echo "3️⃣ Verificando estrutura de arquivos..."
REQUIRED_FILES=(
    "src/services/api.ts"
    "src/contexts/AuthContext.tsx"
    "src/screens/LoginScreen.tsx"
    "src/screens/RegisterScreen.tsx"
    "src/screens/HomeScreen.tsx"
    "src/navigation/AppNavigator.tsx"
    "App.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - Arquivo não encontrado"
    fi
done

# Verificar dependências
echo ""
echo "4️⃣ Verificando dependências..."
if [ -f "node_modules/.bin/expo" ]; then
    echo "✅ Expo CLI instalado"
else
    echo "❌ Expo CLI não encontrado. Execute 'npm install'"
fi

if [ -f "node_modules/axios/package.json" ]; then
    echo "✅ Axios instalado"
else
    echo "❌ Axios não encontrado"
fi

if [ -f "node_modules/@react-navigation/stack/package.json" ]; then
    echo "✅ React Navigation instalado"
else
    echo "❌ React Navigation não encontrado"
fi

echo ""
echo "🎉 Teste concluído!"
echo ""
echo "📱 Para testar o app:"
echo "1. Abra o Expo Go no seu celular"
echo "2. Escaneie o QR code que aparece no terminal"
echo "3. Teste as funcionalidades:"
echo "   - Criar conta"
echo "   - Fazer login"
echo "   - Criar invoice"
echo "   - Verificar pagamento"
echo ""
echo "🔧 Para desenvolvimento:"
echo "- Pressione 'w' para abrir no navegador"
echo "- Pressione 'a' para abrir no emulador Android"
echo "- Pressione 'i' para abrir no emulador iOS"
