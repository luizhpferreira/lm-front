import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PaymentStatusScreen } from '../screens/PaymentStatusScreen';
import { PreferencesScreen } from '../screens/PreferencesScreen';
import { EmailConfirmationScreen } from '../screens/EmailConfirmationScreen';
import { PayInvoiceScreen } from '../screens/PayInvoiceScreen';
import { CreateInvoiceScreen } from '../screens/CreateInvoiceScreen';
import { QRCodeScannerScreen } from '../screens/QRCodeScannerScreen';
import { BitcoinScreen } from '../screens/BitcoinScreen';
import { CreateWalletScreen } from '../screens/CreateWalletScreen';
import { RestoreWalletScreen } from '../screens/RestoreWalletScreen';
import { WalletHomeScreen } from '../screens/WalletHomeScreen';
import { ReceiveBitcoinScreen } from '../screens/ReceiveBitcoinScreen';
import { SendBitcoinScreen } from '../screens/SendBitcoinScreen';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3498db" />
    <Text style={styles.loadingText}>Carregando...</Text>
  </View>
);

export const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Configuração simples do deep linking
  const linking = {
    prefixes: ['bffluma://'],
    config: {
      screens: {
        ResetPassword: {
          path: 'reset-password',
          parse: {
            token: (token: string) => token,
          },
        },
        Login: 'login',
        EmailConfirmation: {
          path: 'confirm-email',
          parse: {
            token: (token: string) => token,
          },
        },
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          // Rotas autenticadas
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
            <Stack.Screen name="PaymentStatus" component={PaymentStatusScreen} />
            <Stack.Screen name="Preferences" component={PreferencesScreen} />
            <Stack.Screen name="PayInvoice" component={PayInvoiceScreen} />
            <Stack.Screen name="QRCodeScanner" component={QRCodeScannerScreen} />
          </>
        ) : (
          // Rotas não autenticadas
          <>
            <Stack.Screen name="Bitcoin" component={BitcoinScreen} />
            <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
            <Stack.Screen name="RestoreWallet" component={RestoreWalletScreen} />
            <Stack.Screen name="WalletHome" component={WalletHomeScreen} />
            <Stack.Screen name="ReceiveBitcoin" component={ReceiveBitcoinScreen} />
            <Stack.Screen name="SendBitcoin" component={SendBitcoinScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
});
