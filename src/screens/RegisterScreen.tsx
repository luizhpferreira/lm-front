import React, { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { colors, spacing, typography } from '../theme';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  // Função para validar CPF
  const validateCpf = (cpf: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Remove caracteres não numéricos
    const cleanCpf = cpf.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) {
      errors.push('CPF deve ter 11 dígitos');
      return { isValid: false, errors };
    }
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCpf)) {
      errors.push('CPF inválido');
      return { isValid: false, errors };
    }
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(9))) {
      errors.push('CPF inválido');
      return { isValid: false, errors };
    }
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(10))) {
      errors.push('CPF inválido');
      return { isValid: false, errors };
    }
    
    return { isValid: true, errors: [] };
  };

  // Função para formatar CPF
  const formatCpf = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Mínimo 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Pelo menos uma letra maiúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Pelo menos uma letra minúscula');
    }

    if (!/\d/.test(password)) {
      errors.push('Pelo menos um número');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Pelo menos um caractere especial');
    }

    // Verificar sequências comuns
    const commonSequences = ['123', 'abc', 'qwe', 'asd', 'zxc', 'password', 'senha'];
    const lowerPassword = password.toLowerCase();
    if (commonSequences.some(seq => lowerPassword.includes(seq))) {
      errors.push('Não pode conter sequências comuns');
    }

    // Verificar caracteres repetidos consecutivos
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        errors.push('Não pode ter mais de 2 caracteres iguais consecutivos');
        break;
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleRegister = async () => {
    console.log('DEBUG: handleRegister called');
    console.log('DEBUG: Current state:', { email, cpf, password, passwordRepeat });
    
    if (!email || !cpf || !password || !passwordRepeat) {
      console.log('DEBUG: Missing required fields');
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    // Valida CPF
    const cpfValidation = validateCpf(cpf);
    if (!cpfValidation.isValid) {
      console.log('DEBUG: CPF validation failed:', cpfValidation.errors);
      Alert.alert('CPF Inválido', cpfValidation.errors.join('\n'));
      return;
    }

    if (password !== passwordRepeat) {
      console.log('DEBUG: Passwords do not match');
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      console.log('DEBUG: Password validation failed:', passwordValidation.errors);
      Alert.alert('Senha Inválida', passwordValidation.errors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      console.log('DEBUG: Calling register with:', { email, cpf: cleanCpf, password, passwordRepeat });
      await register(email, cleanCpf, password, passwordRepeat);
      Alert.alert(
        'Sucesso',
        `Conta criada com sucesso!\nCPF: ${cpf}\n\n📧 Enviamos um email de confirmação para ${email}.\n\nPor favor, confirme seu email antes de fazer login.\n\nApós a confirmação, você receberá um email de boas-vindas.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      console.log('DEBUG: Register error:', error);
      Alert.alert('Erro no Cadastro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { strength: 0, color: '#e1e8ed', text: '' };
    
    const validation = validatePassword(password);
    const validChecks = 6 - validation.errors.length;
    
    if (validChecks <= 2) return { strength: validChecks, color: '#e74c3c', text: 'Fraca' };
    if (validChecks <= 4) return { strength: validChecks, color: '#f39c12', text: 'Média' };
    return { strength: validChecks, color: '#27ae60', text: 'Forte' };
  };

  const passwordStrength = getPasswordStrength();

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
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Crie sua carteira Lightning</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Digite seu email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>CPF</Text>
            <TextInput
              style={styles.input}
              value={cpf}
              onChangeText={(text) => {
                const formatted = formatCpf(text);
                setCpf(formatted);
              }}
              placeholder="000.000.000-00"
              keyboardType="numeric"
              maxLength={14}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Digite sua senha"
              secureTextEntry
              autoCapitalize="none"
            />
            {password.length > 0 && (
              <View style={styles.passwordStrength}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4, 5, 6].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor: index <= passwordStrength.strength 
                            ? passwordStrength.color 
                            : '#e1e8ed'
                        }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.text}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Senha</Text>
            <TextInput
              style={[
                styles.input,
                passwordRepeat && password !== passwordRepeat && styles.inputError
              ]}
              value={passwordRepeat}
              onChangeText={setPasswordRepeat}
              placeholder="Confirme sua senha"
              secureTextEntry
              autoCapitalize="none"
            />
            {passwordRepeat && password !== passwordRepeat && (
              <Text style={styles.errorText}>As senhas não coincidem</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>Já tenho uma conta</Text>
          </TouchableOpacity>
        </View>
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
  form: {
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.cardPadding,
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.inputPadding,
    fontSize: 16,
    backgroundColor: colors.background.tertiary,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error.main,
  },
  inputSuccess: {
    borderColor: colors.success.main,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    color: colors.success.main,
    fontSize: 12,
    marginTop: 4,
  },
  infoText: {
    color: colors.info.main,
    fontSize: 12,
    marginTop: 4,
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBar: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary.main,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.buttonPadding,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[400],
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
