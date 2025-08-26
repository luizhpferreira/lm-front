# 🎯 Solução: Deep Linking no Expo

## ❌ Problema Identificado

Você está certo! O problema é que está usando o **Expo Go**, que tem limitações com deep linking personalizado.

## 🔧 Soluções Implementadas

### 1. Instalação do Expo Dev Client
```bash
npx expo install expo-dev-client
```

### 2. Configuração Atualizada
```json
// app.json
{
  "expo": {
    "scheme": "bffluma",
    "plugins": [
      "expo-font",
      "expo-dev-client"
    ]
  }
}
```

### 3. Prebuild Executado
```bash
npx expo prebuild
```

## 🚀 Próximos Passos

### Opção 1: Development Build (Recomendado)
```bash
# Criar development build
npx expo run:android
# ou
npx expo run:ios
```

### Opção 2: Build de Produção
```bash
# Build para Android
npx expo build:android

# Build para iOS
npx expo build:ios
```

### Opção 3: EAS Build (Cloud)
```bash
# Instalar EAS CLI
npm install -g @expo/eas-cli

# Configurar EAS
eas build:configure

# Criar build
eas build --platform android
# ou
eas build --platform ios
```

## 📱 Como Testar

### 1. Instalar Development Build
1. Execute `npx expo run:android` ou `npx expo run:ios`
2. Instale o app gerado no dispositivo
3. Teste o deep link: `bffluma://reset-password?token=test`

### 2. Teste Manual
```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "bffluma://reset-password?token=test" com.anonymous.lumamobile

# iOS (via Safari)
# Digite: bffluma://reset-password?token=test
```

### 3. Teste via Página Web
1. Acesse: `https://luma.app.br/reset-password?token=test-token`
2. Clique em "📱 Abrir App"
3. Verifique se o app abre

## 🔍 Por que o Expo Go não funciona?

### Limitações do Expo Go:
1. **Scheme personalizado**: Não suporta schemes customizados como `bffluma://`
2. **Deep linking**: Funcionalidade limitada
3. **Plugins nativos**: Alguns plugins não funcionam
4. **Configurações**: Muitas configurações são ignoradas

### Vantagens do Development Build:
1. **Deep linking completo**: Suporta schemes personalizados
2. **Plugins nativos**: Todos os plugins funcionam
3. **Configurações**: Todas as configurações são aplicadas
4. **Performance**: Melhor performance que Expo Go

## 🛠️ Configurações Importantes

### Android (android/app/src/main/AndroidManifest.xml)
```xml
<activity>
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="bffluma" />
    </intent-filter>
</activity>
```

### iOS (ios/YourApp/Info.plist)
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>bffluma</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>bffluma</string>
        </array>
    </dict>
</array>
```

## 🧪 Teste Rápido

### 1. Criar Development Build
```bash
cd mobile_luma
npx expo run:android
```

### 2. Instalar no Dispositivo
- O comando acima vai gerar um APK
- Instale o APK no dispositivo Android

### 3. Testar Deep Link
```bash
# No terminal do dispositivo
adb shell am start -W -a android.intent.action.VIEW -d "bffluma://reset-password?token=test" com.anonymous.lumamobile
```

## ✅ Checklist

- [ ] Expo Dev Client instalado
- [ ] app.json configurado com scheme
- [ ] Prebuild executado
- [ ] Development build criado
- [ ] App instalado no dispositivo
- [ ] Deep link testado

## 🎉 Resultado Esperado

Após seguir estes passos:
1. ✅ Development build criado
2. ✅ App instalado com deep linking
3. ✅ Deep link `bffluma://reset-password?token=test` funciona
4. ✅ Página web redireciona para app corretamente
5. ✅ Token é recebido na tela de reset

## 📞 Suporte

Se ainda houver problemas:
1. Verifique se o development build foi criado corretamente
2. Teste em dispositivo físico (não emulador)
3. Verifique os logs do dispositivo
4. Considere usar EAS Build para builds mais robustos
