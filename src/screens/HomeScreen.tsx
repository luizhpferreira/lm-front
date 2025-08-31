import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService, WalletData, WalletBalanceData } from '../services/api';
import { colors, spacing, typography } from '../theme';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<WalletBalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const loadBalance = async () => {
    try {
      const response = await apiService.getWalletBalance();
      
      if (response.success && response.data) {
        setBalance(response.data);
      } else {
        console.error('Erro ao carregar saldo:', response.message);
      }
    } catch (error: any) {
      console.error('Erro ao carregar saldo:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBalance();
    setRefreshing(false);
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const formatSats = (msats: number) => {
    // Converte de milisatoshis para satoshis (divide por 1000)
    const sats = Math.floor(msats / 1000);
    return sats.toLocaleString('pt-BR');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>⚡</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Luma</Text>
        </View>
        <TouchableOpacity 
          style={styles.preferencesButton} 
          onPress={() => navigation.navigate('Preferences')}
        >
          <Text style={styles.preferencesText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Seção do Saldo */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceCardTitle}>💰 Meu Saldo</Text>
          
          {balanceLoading ? (
            <View style={styles.balanceLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.main} />
              <Text style={styles.balanceLoadingText}>Carregando...</Text>
            </View>
          ) : (
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceValue}>
                {balance ? formatSats(balance.balance) : '0'} sats
              </Text>
              <Text style={styles.balanceLabel}>Saldo Disponível</Text>
            </View>
          )}
        </View>

        {/* Pagamentos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pagamentos</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => navigation.navigate('CreateInvoice')}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText]}>📄 Criar Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => navigation.navigate('PaymentStatus')}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Verificar Pagamento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.tertiaryAction]}
            onPress={() => navigation.navigate('PayInvoice')}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, styles.tertiaryActionText]}>💳 Pagar Invoice</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.screenPadding,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    shadowColor: colors.shadow.light,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: spacing.sm,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gradients.primary[0],
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  preferencesButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.background.tertiary,
  },
  preferencesText: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: spacing.screenPadding,
  },
  balanceCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  balanceLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  balanceLoadingText: {
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.text.secondary,
  },
  balanceContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background.tertiary,
    borderRadius: spacing.borderRadius.md,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.sm,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 2,
    textAlign: 'right',
  },
  actionButton: {
    borderRadius: spacing.borderRadius.md,
    padding: spacing.buttonPadding,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryAction: {
    backgroundColor: colors.primary.main,
  },
  secondaryAction: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  tertiaryAction: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: colors.success.main,
  },
  actionButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionText: {
    color: colors.primary.main,
  },
  tertiaryActionText: {
    color: colors.success.main,
  },

});
