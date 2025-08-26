import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { isTablet, isPhone } from '../utils/responsive';

interface ResetPasswordScreenProps {
  navigation: any;
  route: any;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation, route }) => {
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const { resetPassword } = useAuth();
  const tablet = isTablet();
  const mobile = isPhone();

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

  // O React Navigation já gerencia o deep linking automaticamente
  // através da configuração no NavigationContainer

  const handleResetPassword = async () => {
    if (showTokenInput && !token) {
      Alert.alert('Erro', 'Por favor, digite o token de recuperação');
      return;
    }

    if (!newPassword) {
      Alert.alert('Erro', 'Por favor, digite a nova senha');
      return;
    }

    if (!newPasswordRepeat) {
      Alert.alert('Erro', 'Por favor, confirme a nova senha');
      return;
    }

    if (newPassword !== newPasswordRepeat) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword, newPasswordRepeat);
      Alert.alert(
        'Sucesso',
        'Senha redefinida com sucesso! Você pode fazer login com sua nova senha.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Validando token...</Text>
      </View>
    );
  }

  if (!tokenValid && !showTokenInput) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Token Inválido</Text>
        <Text style={styles.errorMessage}>
          O link de redefinição de senha é inválido ou expirou.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.buttonText}>Solicitar Novo Link</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>Voltar para o login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.content, tablet && styles.tabletContent]}>
          <View style={styles.header}>
            <Text style={styles.title}>Redefinir Senha</Text>
            <Text style={styles.subtitle}>
              Digite sua nova senha abaixo
            </Text>
          </View>

          <View style={styles.form}>
            {showTokenInput && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Token de Recuperação</Text>
                <TextInput
                  style={styles.input}
                  value={token}
                  onChangeText={setToken}
                  placeholder="Digite o token recebido por email"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.helpText}>
                  Digite o token que você recebeu por email para redefinir sua senha.
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nova Senha</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Digite sua nova senha"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar Nova Senha</Text>
              <TextInput
                style={styles.input}
                value={newPasswordRepeat}
                onChangeText={setNewPasswordRepeat}
                placeholder="Confirme sua nova senha"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>A senha deve conter:</Text>
              <Text style={styles.requirement}>• Pelo menos 8 caracteres</Text>
              <Text style={styles.requirement}>• Letras e números</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>Voltar para o login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  tabletContent: {
    maxWidth: 500,
  },
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  helpText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    fontStyle: 'italic',
  },
  passwordRequirements: {
    backgroundColor: '#f1f2f6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#3498db',
    fontSize: 14,
  },
});
