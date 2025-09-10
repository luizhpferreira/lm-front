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

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    if (wallet) {
      checkBackendAndLoadBalance();
    }
  }, [wallet]);

  const checkBackendAndLoadBalance = async () => {
    try {
      console.log('🔍 Verificando disponibilidade do backend...');
      const isAvailable = await bitcoinService.instance.isBackendAvailable();
      console.log('✅ Backend disponível:', isAvailable);
      setBackendAvailable(isAvailable);
      
      if (isAvailable && wallet) {
        console.log('🔍 Carregando saldo para endereço:', wallet.addresses.p2pkh);
        // Carregar saldo real do backend (usar Legacy por padrão)
        const addressBalance = await bitcoinService.instance.getAddressBalance(wallet.addresses.p2pkh);
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
    await loadBalance();
    await checkBackendAndLoadBalance();
    setIsRefreshing(false);
  };

  const handleSend = () => {
    navigation.navigate('SendBitcoin', { wallet });
  };

  const handleReceive = () => {
    navigation.navigate('ReceiveBitcoin', { wallet });
  };

  const handleSettings = () => {
    navigation.navigate('WalletSettings', { wallet });
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

  const handleBackup = () => {
    Alert.alert(
      'Backup da Carteira',
      'Para fazer backup, anote seu mnemônico em local seguro.',
      [
        {
          text: 'Ver Mnemônico',
          onPress: () => navigation.navigate('BackupWallet', { wallet }),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Carteira Bitcoin</Text>
          <Text style={styles.subtitle}>Modo Soberano</Text>
        </View>

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

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Ações Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSend}>
              <View style={[styles.actionIcon, { backgroundColor: '#ff6b6b' }]}>
                <Text style={styles.actionIconText}>→</Text>
              </View>
              <Text style={styles.actionText}>Enviar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleReceive}>
              <View style={[styles.actionIcon, { backgroundColor: '#51cf66' }]}>
                <Text style={styles.actionIconText}>←</Text>
              </View>
              <Text style={styles.actionText}>Receber</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleBackup}>
              <View style={[styles.actionIcon, { backgroundColor: '#ffd43b' }]}>
                <Text style={styles.actionIconText}>💾</Text>
              </View>
              <Text style={styles.actionText}>Backup</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleSettings}>
              <View style={[styles.actionIcon, { backgroundColor: '#74c0fc' }]}>
                <Text style={styles.actionIconText}>⚙️</Text>
              </View>
              <Text style={styles.actionText}>Config</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Info */}
        <View style={styles.walletInfoContainer}>
          <Text style={styles.walletInfoTitle}>Informações da Carteira</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Endereço Principal:</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
              {wallet.addresses.p2pkh}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo:</Text>
            <Text style={styles.infoValue}>Legacy (P2PKH)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rede:</Text>
            <Text style={styles.infoValue}>Bitcoin Mainnet</Text>
          </View>
        </View>

        {/* Security Notice */}
        <View style={styles.securityContainer}>
          <Text style={styles.securityTitle}>🔒 Segurança</Text>
          <Text style={styles.securityText}>
            Suas chaves privadas estão seguras no seu dispositivo. 
            Faça backup do seu mnemônico em local seguro.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Bitcoin')}
        >
          <Text style={styles.navButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
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
  actionsContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
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
  walletInfoContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  walletInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 2,
    textAlign: 'right',
  },
  securityContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: spacing.sm,
  },
  securityText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  bottomNav: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  navButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: 25,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
});
