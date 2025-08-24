import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Configura o deep linking
    const handleDeepLink = (url: string) => {
      console.log('Deep link recebido:', url);
      
      // Extrai o token da URL se for um link de confirmação
      if (url.includes('confirm-email')) {
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        if (token) {
          // Navega para a tela de confirmação com o token
          // Isso será tratado pelo AuthContext ou navegador
          console.log('Token de confirmação extraído:', token);
        }
      }
    };

    // Listener para quando o app já está aberto
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Verifica se o app foi aberto por um deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
