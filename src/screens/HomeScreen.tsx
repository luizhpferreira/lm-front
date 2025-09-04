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
  Modal,
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
  const [showPayModal, setShowPayModal] = useState(false);

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
          <Text style={styles.preferencesText}>☰</Text>
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
          
          {balanceLoading ? (
            <View style={styles.balanceLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.main} />
              <Text style={styles.balanceLoadingText}>Carregando...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.balanceValue}>
                {balance ? formatSats(balance.balance) : '0'} sats
              </Text>
              <Text style={styles.balanceLabel}>Saldo Disponível</Text>
            </>
          )}
        </View>

        {/* Pagamentos */}
        <View style={styles.card}>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => navigation.navigate('CreateInvoice')}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText]}>Criar Pagamento</Text>
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
            onPress={() => setShowPayModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, styles.tertiaryActionText]}>Pagar</Text>
          </TouchableOpacity>
        </View>

        {/* Modal de Pagamento */}
        <Modal
          visible={showPayModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPayModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>

              
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.payInvoiceButton]}
                  onPress={() => {
                    setShowPayModal(false);
                    navigation.navigate('PayInvoice');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonText}>Colar Pagamento</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.scannerButton]}
                  onPress={() => {
                    setShowPayModal(false);
                    navigation.navigate('QRCodeScanner');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonText}>Escanear</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPayModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
    paddingHorizontal: 16, // Padding fixo menor para iPhone
    paddingVertical: 12, // Padding vertical reduzido
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
    flex: 1, // Ocupar espaço disponível
  },
  logoContainer: {
    marginRight: spacing.sm,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 22, // Título um pouco menor para iPhone
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1, // Ocupar espaço disponível
  },
  preferencesButton: {
    padding: 8, // Padding reduzido para iPhone
    borderRadius: spacing.borderRadius.sm,
  },
  preferencesText: {
    fontSize: 18, // Texto um pouco menor para iPhone
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: Math.max(16, spacing.screenPadding * 0.8), // Responsivo mas otimizado para iPhone
    paddingVertical: Math.max(12, spacing.screenPadding * 0.6), // Responsivo mas otimizado para iPhone
  },
  balanceCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    padding: 20, // Padding fixo menor para iPhone
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
    padding: 20, // Padding fixo menor para iPhone
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
    borderRadius: 25, // Formato de cápsula
    paddingVertical: 10, // Padding reduzido para iPhone
    paddingHorizontal: 16, // Padding reduzido para iPhone
    alignItems: 'center',
    marginBottom: spacing.sm,
    minHeight: 42, // Botões um pouco menores para iPhone
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  quaternaryAction: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: colors.info.main,
  },
  actionButtonText: {
    color: colors.text.inverse,
    fontSize: 15, // Fonte um pouco menor para iPhone
    fontWeight: '600',
  },
  secondaryActionText: {
    color: colors.primary.main,
  },
  tertiaryActionText: {
    color: colors.success.main,
  },
  quaternaryActionText: {
    color: colors.info.main,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: spacing.borderRadius.lg,
    padding: 20, // Padding fixo menor para iPhone
    width: '85%', // Largura um pouco maior para iPhone
    alignItems: 'center',
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.md,
  },
  modalButton: {
    borderRadius: 25, // Formato de cápsula
    paddingVertical: 10, // Padding reduzido para iPhone
    paddingHorizontal: 16, // Padding reduzido para iPhone
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.sm,
    minHeight: 42, // Botões um pouco menores para iPhone
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payInvoiceButton: {
    backgroundColor: colors.primary.main,
  },
  scannerButton: {
    backgroundColor: colors.info.main,
  },
  modalButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 25, // Formato de cápsula
    paddingVertical: Math.max(10, spacing.sm * 1.2), // Responsivo mas otimizado para iPhone
    paddingHorizontal: Math.max(16, spacing.md * 1.2), // Responsivo mas otimizado para iPhone
    width: '80%',
    minHeight: Math.max(42, 45 * 0.9), // Responsivo mas otimizado para iPhone
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

});
