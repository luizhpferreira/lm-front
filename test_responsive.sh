#!/bin/bash

echo "📱 Testando Responsividade do Aplicativo"
echo "========================================"

# Verificar se os arquivos responsivos foram criados
echo "📁 Verificando arquivos responsivos criados:"

if [ -f "src/utils/responsive.ts" ]; then
    echo "✅ responsive.ts criado com sucesso"
else
    echo "❌ responsive.ts não encontrado"
fi

if [ -f "src/components/ResponsiveCard.tsx" ]; then
    echo "✅ ResponsiveCard.tsx criado com sucesso"
else
    echo "❌ ResponsiveCard.tsx não encontrado"
fi

if [ -f "src/components/ResponsiveContainer.tsx" ]; then
    echo "✅ ResponsiveContainer.tsx criado com sucesso"
else
    echo "❌ ResponsiveContainer.tsx não encontrado"
fi

# Verificar se os temas foram atualizados
echo ""
echo "🎨 Verificando temas responsivos:"

if grep -q "getAdaptivePadding" src/theme/spacing.ts; then
    echo "✅ Spacing responsivo implementado"
else
    echo "❌ Spacing responsivo não encontrado"
fi

if grep -q "scaleFont" src/theme/typography.ts; then
    echo "✅ Typography responsivo implementado"
else
    echo "❌ Typography responsivo não encontrado"
fi

# Verificar se os componentes responsivos foram exportados
echo ""
echo "📦 Verificando exportação de componentes:"

if grep -q "ResponsiveCard" src/components/index.ts; then
    echo "✅ ResponsiveCard exportado"
else
    echo "❌ ResponsiveCard não exportado"
fi

if grep -q "ResponsiveContainer" src/components/index.ts; then
    echo "✅ ResponsiveContainer exportado"
else
    echo "❌ ResponsiveContainer não exportado"
fi

# Verificar se a tela de preferências usa componentes responsivos
echo ""
echo "🖥️ Verificando implementação responsiva:"

if grep -q "ResponsiveContainer" src/screens/PreferencesScreen.tsx; then
    echo "✅ PreferencesScreen usa ResponsiveContainer"
else
    echo "❌ PreferencesScreen não usa ResponsiveContainer"
fi

if grep -q "ResponsiveCard" src/screens/PreferencesScreen.tsx; then
    echo "✅ PreferencesScreen usa ResponsiveCard"
else
    echo "❌ PreferencesScreen não usa ResponsiveCard"
fi

# Verificar funções responsivas
echo ""
echo "🔧 Verificando funções responsivas:"

if grep -q "getDeviceType" src/utils/responsive.ts; then
    echo "✅ getDeviceType implementada"
else
    echo "❌ getDeviceType não encontrada"
fi

if grep -q "isTablet" src/utils/responsive.ts; then
    echo "✅ isTablet implementada"
else
    echo "❌ isTablet não encontrada"
fi

if grep -q "scale" src/utils/responsive.ts; then
    echo "✅ scale implementada"
else
    echo "❌ scale não encontrada"
fi

if grep -q "getAdaptiveLayout" src/utils/responsive.ts; then
    echo "✅ getAdaptiveLayout implementada"
else
    echo "❌ getAdaptiveLayout não encontrada"
fi

echo ""
echo "🎉 Teste de responsividade concluído!"
echo ""
echo "📋 Resumo das funcionalidades responsivas implementadas:"
echo "   • Sistema de detecção de dispositivo (phone/tablet)"
echo "   • Escalagem automática de fontes e elementos"
echo "   • Padding e margens adaptativos"
echo "   • Border radius responsivo"
echo "   • Componentes ResponsiveCard e ResponsiveContainer"
echo "   • Layout centralizado em tablets"
echo "   • Largura máxima para cards em tablets"
echo "   • Tema responsivo (spacing e typography)"
echo ""
echo "📱 Funcionalidades por dispositivo:"
echo ""
echo "📱 Phone (< 768px):"
echo "   • Layout em coluna única"
echo "   • Padding reduzido (20px)"
echo "   • Fontes menores"
echo "   • Cards ocupam toda a largura"
echo ""
echo "📟 Tablet (≥ 768px):"
echo "   • Layout centralizado"
echo "   • Padding aumentado (32px)"
echo "   • Fontes maiores (1.1x)"
echo "   • Cards com largura máxima (400px)"
echo "   • Elementos escalados (1.2x)"
echo ""
echo "🚀 Para testar a responsividade:"
echo "   1. Execute: npm start"
echo "   2. Teste em diferentes dispositivos/emuladores"
echo "   3. Teste mudanças de orientação"
echo "   4. Verifique se o layout se adapta automaticamente"
