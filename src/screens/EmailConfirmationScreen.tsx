import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiService } from '../services/api';
import { colors, spacing, typography } from '../theme';

interface EmailConfirmationScreenProps {
  navigation: any;
}

export const EmailConfirmationScreen: React.FC<EmailConfirmationScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const route = useRoute();
  const nav = useNavigation();

  useEffect(() => {
    const token = (route.params as any)?.token;
    if (token) {
      confirmEmail(token);
    }
  }, []);

  const confirmEmail = async (token: string) => {
    setLoading(true);
    try {
      const response = await apiService.confirmEmail(token);
      if (response.success) {
        setConfirmed(true);
        Alert.alert(
          'Sucesso!',
          'Seu email foi confirmado com sucesso! Agora você pode fazer login.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Erro', response.message || 'Erro ao confirmar email');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao confirmar email');
    } finally {
      setLoading(false);
    }
  };

  const openEmailApp = () => {
    Linking.openURL('mailto:');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Confirmando seu email...</Text>
        </View>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✅</Text>
          </View>
          <Text style={styles.title}>Email Confirmado!</Text>
          <Text style={styles.subtitle}>
            Seu email foi confirmado com sucesso. Agora você pode fazer login na sua conta.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>📧</Text>
        </View>
        
        <Text style={styles.title}>Confirme seu Email</Text>
        <Text style={styles.subtitle}>
          Enviamos um link de confirmação para o seu email. Clique no link para confirmar sua conta.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 O que fazer:</Text>
          <Text style={styles.infoText}>1. Verifique sua caixa de entrada</Text>
          <Text style={styles.infoText}>2. Clique no link de confirmação</Text>
          <Text style={styles.infoText}>3. Volte ao app para fazer login</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Text style={styles.button} onPress={openEmailApp}>
            📱 Abrir App de Email
          </Text>
        </View>

        <Text style={styles.footerText}>
          Não recebeu o email? Verifique sua pasta de spam ou solicite um novo link.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconText: {
    fontSize: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIconText: {
    fontSize: 40,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },
  infoBox: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary.main,
    color: colors.text.inverse,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    textAlign: 'center',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold as any,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
  },
  loadingText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
