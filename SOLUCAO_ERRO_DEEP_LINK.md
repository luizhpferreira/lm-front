# 🔧 Solução para Erro de Deep Linking

## ❌ Erro Encontrado

```
Render Error
Couldn't find a navigation object. Is your component inside NavigationContainer?

Sources
useDeepLinking
AppNavigator
```

## 🔍 Causa do Problema

O erro ocorre porque o React Navigation está tentando usar o deep linking antes do `NavigationContainer` estar completamente inicializado. Isso pode acontecer por alguns motivos:

1. **Timing de inicialização**: O deep linking é configurado antes do contexto de navegação estar pronto
2. **Configuração incorreta**: O `linking` configurado no `NavigationContainer` pode estar com problemas
3. **Versão do React Navigation**: Incompatibilidade entre versões

## ✅ Soluções Implementadas

### 1. Simplificação do Deep Linking

Removemos o `Linking.addEventListener` manual da tela `ResetPasswordScreen` porque o React Navigation já gerencia isso automaticamente através da configuração no `NavigationContainer`.

**Antes (problemático):**
```typescript
// Configurar listener para deep links
useEffect(() => {
  const subscription = Linking.addEventListener('url', (event) => {
    handleDeepLink(event.url);
  });
  return () => subscription?.remove();
}, []);
```

**Depois (correto):**
```typescript
// O React Navigation já gerencia o deep linking automaticamente
// através da configuração no NavigationContainer
```

### 2. Configuração Correta no NavigationContainer

```typescript
// AppNavigator.tsx
const linking = {
  prefixes: ['bffluma://'],
  config: {
    screens: {
      Login: 'login',
      ResetPassword: 'reset-password',
      EmailConfirmation: 'confirm-email',
    },
  },
};

return (
  <NavigationContainer linking={linking}>
    {/* ... */}
  </NavigationContainer>
);
```

### 3. Recebimento de Parâmetros na Tela

```typescript
// ResetPasswordScreen.tsx
useEffect(() => {
  // Extrair token da URL ou parâmetros da rota
  const tokenFromRoute = route.params?.token;
  if (tokenFromRoute) {
    setToken(tokenFromRoute);
    setTokenValid(true);
    setValidatingToken(false);
  } else {
    // Se não há token, permitir entrada manual
    setValidatingToken(false);
    setShowTokenInput(true);
  }
}, [route.params]);
```

## 🧪 Como Testar

### 1. Teste Local
```bash
# Iniciar o app
npx expo start

# Abrir o arquivo de teste
open test_deep_link.html
```

### 2. Teste com Deep Link
```bash
# No terminal (macOS/Linux)
open "bffluma://reset-password?token=test-token"

# No Windows
start "bffluma://reset-password?token=test-token"
```

### 3. Teste via Web
Abra o arquivo `test_deep_link.html` no navegador e clique nos botões de teste.

## 🔧 Troubleshooting Adicional

### Se o erro persistir:

1. **Limpar cache do Expo:**
```bash
npx expo start --clear
```

2. **Reinstalar dependências:**
```bash
rm -rf node_modules
npm install
```

3. **Verificar versões:**
```bash
npm list @react-navigation/native
npm list @react-navigation/stack
```

4. **Testar em dispositivo físico:**
- Deep links funcionam melhor em dispositivos físicos
- Emuladores podem ter problemas com deep linking

### Verificações Importantes:

1. **Scheme configurado no app.json:**
```json
{
  "expo": {
    "scheme": "bffluma"
  }
}
```

2. **App compilado corretamente:**
```bash
npx expo build:android
# ou
npx expo build:ios
```

3. **App instalado no dispositivo:**
- Deep links só funcionam se o app estiver instalado

## 📱 Fluxo de Teste Completo

1. **Instalar o app** no dispositivo
2. **Abrir o arquivo de teste** `test_deep_link.html`
3. **Clicar no botão** "Abrir App - Reset Senha"
4. **Verificar se o app abre** na tela de reset de senha
5. **Verificar se o token** é recebido corretamente

## 🎯 Resultado Esperado

Após as correções:
- ✅ App inicia sem erros
- ✅ Deep links funcionam corretamente
- ✅ Tokens são recebidos nas telas
- ✅ Navegação funciona normalmente

## 📞 Suporte

Se o problema persistir:
1. Verifique os logs do console
2. Teste em dispositivo físico
3. Verifique se todas as dependências estão atualizadas
4. Considere usar uma versão específica do React Navigation
