import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, typography } from '../theme';
import { Button, Input, Card } from '../components';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Função para formatar CPF
  const formatCpf = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleLogin = async () => {
    if (!cpf || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      // Remove formatação do CPF para enviar ao backend
      const cleanCpf = cpf.replace(/\D/g, '');
      await login(cleanCpf, password);
      // Navegação será feita automaticamente pelo AuthContext
    } catch (error: any) {
      Alert.alert('Erro no Login', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>⚡</Text>
            </View>
          </View>
          <Text style={styles.title}>Luma App</Text>
          <Text style={styles.subtitle}>Faça login na sua carteira Lightning</Text>
        </View>

        <Card variant="elevated">
          <Input
            label="CPF"
            value={cpf}
            onChangeText={(text: string) => {
              const formatted = formatCpf(text);
              setCpf(formatted);
            }}
            placeholder="000.000.000-00"
            keyboardType="numeric"
            maxLength={14}
          />

          <Input
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Digite sua senha"
            secureTextEntry
            autoCapitalize="none"
          />

          <Button
            title={loading ? 'Entrando...' : 'Entrar'}
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            style={{ marginBottom: spacing.md }}
          />

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.linkText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Criar nova conta"
            onPress={() => navigation.navigate('Register')}
            variant="outline"
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.screenPadding,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gradients.primary[0],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  linkButton: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: colors.primary.main,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.text.tertiary,
  },

});
