import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { colors, spacing } from '../theme';
import { bitcoinService } from '../services/bitcoinService';
import { Ionicons } from '@expo/vector-icons';

interface WalletHomeScreenProps {
  navigation: any;
  route: any;
}

export const WalletHomeScreen: React.FC<WalletHomeScreenProps> = ({ navigation, route }) => {
  const [wallet, setWallet] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [balanceUnit, setBalanceUnit] = useState<'sats' | 'BTC'>('sats');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    if (wallet) {
      checkBackendAndLoadBalance();
      loadTransactions();
    }
  }, [wallet]);

  const checkBackendAndLoadBalance = async () => {
    try {
      console.log('🔍 Verificando disponibilidade do backend...');
      const isAvailable = await bitcoinService.instance.isBackendAvailable();
      console.log('✅ Backend disponível:', isAvailable);
      setBackendAvailable(isAvailable);
      
      if (isAvailable && wallet) {
        // Priorizar Bech32, depois Legacy, depois P2SH
        const walletAddress = wallet.addresses.bech32 || wallet.addresses.p2pkh || wallet.addresses.p2sh;
        console.log('🔍 Carregando saldo para endereço:', walletAddress);
        // Carregar saldo real do backend (usar Bech32 por padrão)
        const addressBalance = await bitcoinService.instance.getAddressBalance(walletAddress);
        console.log('✅ Resposta do saldo:', addressBalance);
        const balanceInBTC = addressBalance.balance / 100000000;
        console.log('💰 Saldo convertido para BTC:', balanceInBTC);
        setBalance(balanceInBTC);
        console.log('✅ Saldo real carregado:', addressBalance.balance, 'sats');
      } else {
        console.log('⚠️ Backend não disponível ou carteira não carregada');
        console.log('Backend disponível:', isAvailable);
        console.log('Carteira carregada:', !!wallet);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar saldo do backend:', error);
    }
  };

  const loadWallet = async () => {
    try {
      setIsLoading(true);
      let currentWallet = wallet;
      
      // Se veio da navegação, usar a carteira passada
      if (route?.params?.wallet) {
        currentWallet = route.params.wallet;
        setWallet(currentWallet);
      } else {
        // Caso contrário, carregar do armazenamento
        const savedWallet = await bitcoinService.instance.loadWallet();
        if (savedWallet) {
          currentWallet = savedWallet;
          setWallet(savedWallet);
        } else {
          // Se não há carteira, voltar para a tela Bitcoin
          navigation.navigate('Bitcoin');
          return;
        }
      }

      // Simular carregamento de saldo (em produção, buscar do backend)
      await loadBalance();
    } catch (error) {
      console.error('Erro ao carregar carteira:', error);
      Alert.alert('Erro', 'Falha ao carregar carteira.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBalance = async () => {
    // Não fazer nada - o saldo real vem do checkBackendAndLoadBalance
    // Esta função era para simulação, mas agora usamos dados reais
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadBalance();
      await checkBackendAndLoadBalance();
      if (wallet) {
        await loadTransactions();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSend = () => {
    navigation.navigate('SendBitcoin', { wallet });
  };

  const handleReceive = () => {
    navigation.navigate('ReceiveBitcoin', { wallet });
  };

  const loadTransactions = async () => {
    if (!wallet) return;
    
    setLoadingTransactions(true);
    try {
      // Obter endereço da carteira (priorizar Bech32, depois Legacy, depois P2SH)
      const walletAddress = wallet.addresses.bech32 || wallet.addresses.p2pkh || wallet.addresses.p2sh;
      if (!walletAddress) {
        console.log('⚠️ Nenhum endereço da carteira encontrado');
        setTransactions([]);
        return;
      }
      
      console.log('🔍 Carregando transações para endereço:', walletAddress);
      const transactions = await bitcoinService.instance.getTransactions(walletAddress);
      console.log('✅ Transações carregadas:', transactions.length);
      
      setTransactions(transactions);
    } catch (error) {
      console.error('❌ Erro ao carregar transações:', error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };


  const toggleBalanceUnit = () => {
    setBalanceUnit(prev => prev === 'sats' ? 'BTC' : 'sats');
  };

  const formatBalance = () => {
    if (balanceUnit === 'sats') {
      return bitcoinService.instance.formatSatoshis(balance * 100000000);
    } else {
      return `${balance.toFixed(8)} BTC`;
    }
  };

  const formatTransactionAmount = (amount: number) => {
    if (balanceUnit === 'sats') {
      return `${amount.toLocaleString()} sats`;
    } else {
      return `${(amount / 100000000).toFixed(8)} BTC`;
    }
  };

  const formatTransactionTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h atrás`;
    } else if (minutes > 0) {
      return `${minutes}min atrás`;
    } else {
      return 'Agora';
    }
  };


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando carteira...</Text>
      </View>
    );
  }

  if (!wallet) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Carteira não encontrada</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.navigate('Bitcoin')}
        >
          <Text style={styles.errorButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com botão de voltar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Bitcoin')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Carteira Bitcoin</Text>
          <Text style={styles.subtitle}>Modo Soberano</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Total</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>
              {formatBalance()}
            </Text>
            <TouchableOpacity style={styles.unitToggle} onPress={toggleBalanceUnit}>
              <Text style={styles.unitToggleText}>⇅</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceSubtext}>
            {balance === 0 ? 'Carteira vazia - Receba seu primeiro Bitcoin!' : 'Atualizado agora'}
          </Text>
        </View>

        {/* Transaction History */}
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Histórico</Text>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={loadTransactions}
              disabled={loadingTransactions}
            >
              <Ionicons 
                name="refresh" 
                size={20} 
                color={loadingTransactions ? colors.text.disabled : colors.primary.main} 
              />
            </TouchableOpacity>
          </View>
          {loadingTransactions ? (
            <View style={styles.historyLoading}>
              <Text style={styles.historyLoadingText}>Carregando transações...</Text>
            </View>
          ) : transactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {transactions.slice(0, 3).map((tx) => (
                <View key={tx.id} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <Text style={styles.transactionIconText}>
                      {tx.type === 'received' ? '↓' : '↑'}
                    </Text>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionType}>
                      {tx.type === 'received' ? 'Recebido' : 'Enviado'}
                    </Text>
                    <Text style={styles.transactionTime}>
                      {formatTransactionTime(tx.timestamp)}
                    </Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.transactionAmountText,
                      { color: tx.type === 'received' ? '#51cf66' : '#ff6b6b' }
                    ]}>
                      {tx.type === 'received' ? '+' : '-'}{formatTransactionAmount(tx.amount)}
                    </Text>
                    <Text style={styles.transactionConfirmations}>
                      {tx.confirmations} confirmações
                    </Text>
                  </View>
                </View>
              ))}
              {transactions.length > 3 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>Ver todas as transações</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noTransactions}>
              <Text style={styles.noTransactionsText}>Nenhuma transação ainda</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleReceive}>
            <View style={[styles.actionIcon, { backgroundColor: '#51cf66' }]}>
              <Text style={styles.actionIconText}>←</Text>
            </View>
            <Text style={styles.actionText}>Receber</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSend}>
            <View style={[styles.actionIcon, { backgroundColor: '#ff6b6b' }]}>
              <Text style={styles.actionIconText}>→</Text>
            </View>
            <Text style={styles.actionText}>Enviar</Text>
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  balanceCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  unitToggle: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  unitToggleText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  balanceLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
  },
  balanceSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl * 3,
    marginBottom: spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionIconText: {
    fontSize: 20,
    color: colors.text.onPrimary,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  historyContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  historyLoading: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  historyLoadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  transactionsList: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionIconText: {
    fontSize: 18,
    color: colors.text.primary,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  transactionTime: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionConfirmations: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  viewAllButton: {
    padding: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '600',
  },
  noTransactions: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  noTransactionsText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
