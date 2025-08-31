import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface WalletBalanceScreenProps {
  navigation: any;
}

export const WalletBalanceScreen: React.FC<WalletBalanceScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBalance = async () => {
    try {
      const response = await apiService.getWalletBalance();
      
      if (response.success && response.data) {
        setBalance(response.data);
      } else {
        Alert.alert('Erro', response.message || 'Erro ao carregar saldo.');
      }
    } catch (error: any) {
      console.error('Erro ao carregar saldo:', error);
      Alert.alert(
        'Erro',
        error.message || 'Erro ao carregar saldo da carteira. Tente novamente.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBalance();
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const formatSats = (msats: number) => {
    // Converte de milisatoshis para satoshis (divide por 1000)
    const sats = Math.floor(msats / 1000);
    return sats.toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Carregando saldo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>💰</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Meu Saldo</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Saldo da Carteira</Text>
          
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Saldo Disponível</Text>
            <Text style={styles.balanceValue}>
              {balance ? formatSats(balance.balance) : '0'} sats
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Wallet ID:</Text>
            <Text style={styles.infoValue}>{balance?.wallet_id || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{balance?.email || user?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pagamentos Pendentes:</Text>
            <Text style={styles.infoValue}>
              {balance ? formatSats(balance.pending) : '0'} sats
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Máximo Pendente:</Text>
            <Text style={styles.infoValue}>
              {balance ? formatSats(balance.max_pending) : '0'} sats
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ações</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateInvoice')}
          >
            <Text style={styles.actionButtonText}>💰 Receber Pagamento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PayInvoice')}
          >
            <Text style={styles.actionButtonText}>💳 Fazer Pagamento</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
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
  content: {
    flex: 1,
    padding: spacing.screenPadding,
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
  balanceContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background.tertiary,
    borderRadius: spacing.borderRadius.md,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary.main,
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
    backgroundColor: colors.primary.main,
    padding: spacing.buttonPadding,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
