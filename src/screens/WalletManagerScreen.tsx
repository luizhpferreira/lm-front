import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing } from '../theme';
import { bitcoinService } from '../services/bitcoinService';
import { multiWalletService, WalletInfo } from '../services/multiWalletService';
import { ResponsiveContainer, ResponsiveCard } from '../components';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { Ionicons } from '@expo/vector-icons';

interface WalletManagerScreenProps {
  navigation: any;
}

export const WalletManagerScreen: React.FC<WalletManagerScreenProps> = ({ navigation }) => {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWallet, setNewWallet] = useState<any>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const deviceInfo = useDeviceInfo();

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);
      
      // Migrar carteira atual se necessário
      await multiWalletService.migrateCurrentWallet();
      
      // Carregar todas as carteiras
      const allWallets = await multiWalletService.loadWallets();
      setWallets(allWallets);
      
      console.log('✅ Carteiras carregadas:', allWallets.length);
    } catch (error) {
      console.error('Erro ao carregar carteiras:', error);
      setWallets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = () => {
    setShowCreateModal(true);
  };

  const handleGenerateWallet = async () => {
    try {
      setIsCreating(true);
      
      // Verificar se o serviço está disponível
      if (!bitcoinService.instance) {
        throw new Error('Serviço Bitcoin não está disponível');
      }
      
      const wallet = await bitcoinService.instance.generateWallet();
      setNewWallet(wallet);
      setShowMnemonic(true);
    } catch (error) {
      console.error('Erro ao gerar carteira:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert(
        'Erro ao Gerar Carteira', 
        `Não foi possível gerar a carteira: ${errorMessage}\n\nTente novamente ou reinicie o aplicativo.`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmMnemonic = async () => {
    try {
      if (!newWallet) {
        Alert.alert('Erro', 'Carteira não encontrada');
        return;
      }

      // Salvar nova carteira no sistema de múltiplas carteiras
      const walletInfo = {
        id: multiWalletService.generateWalletId(),
        name: `Carteira ${new Date().toLocaleDateString()}`,
        address: newWallet.addresses?.bech32 || newWallet.addresses?.p2pkh || 'N/A',
        balance: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        mnemonic: newWallet.mnemonic || ''
      };

      await multiWalletService.addWallet(walletInfo);
      console.log('✅ Nova carteira salva:', walletInfo);

      // Recarregar lista de carteiras
      await loadWallets();

      // Fechar modal
      setShowCreateModal(false);
      setShowMnemonic(false);
      setNewWallet(null);

      Alert.alert(
        'Carteira Criada!',
        'Sua nova carteira Bitcoin foi criada com sucesso.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Bitcoin'),
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao salvar nova carteira:', error);
      Alert.alert('Erro', 'Não foi possível salvar a nova carteira.');
    }
  };

  const handleBackupLater = () => {
    Alert.alert(
      'Atenção!',
      'É altamente recomendado fazer backup do seu mnemônico agora. Você pode fazer isso depois nas configurações.',
      [
        {
          text: 'Fazer Backup Agora',
          onPress: handleConfirmMnemonic,
        },
        {
          text: 'Depois',
          onPress: handleConfirmMnemonic, // Salvar carteira mesmo sem backup
          style: 'cancel',
        },
      ]
    );
  };

  const handleSelectWallet = async (walletId: string) => {
    try {
      // Definir como carteira ativa
      await multiWalletService.setActiveWallet(walletId);
      
      // Recarregar lista para atualizar status
      await loadWallets();
      
      Alert.alert(
        'Carteira Ativada', 
        'Carteira selecionada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Bitcoin')
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao selecionar carteira:', error);
      Alert.alert('Erro', 'Não foi possível ativar a carteira selecionada.');
    }
  };

  const handleWalletSettings = (walletId: string) => {
    navigation.navigate('BitcoinPreferences', { walletId });
  };

  const formatAddress = (address: string) => {
    if (address.length > 20) {
      return `${address.slice(0, 10)}...${address.slice(-10)}`;
    }
    return address;
  };

  const formatBalance = (balance: number) => {
    if (balance === 0) {
      return '0 sats';
    }
    return `${balance.toLocaleString()} sats`;
  };

  const renderWalletItem = ({ item }: { item: WalletInfo }) => (
    <ResponsiveCard>
      <TouchableOpacity
        style={styles.walletItem}
        onPress={() => handleSelectWallet(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.walletInfo}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletName}>{item.name}</Text>
            {item.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Ativa</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.walletAddress}>{formatAddress(item.address)}</Text>
          <Text style={styles.walletBalance}>{formatBalance(item.balance)}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.walletSettings}
          onPress={() => handleWalletSettings(item.id)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </ResponsiveCard>
  );

  // Estilos dinâmicos baseados no dispositivo
  const dynamicStyles = StyleSheet.create({
    header: {
      ...styles.header,
      paddingVertical: deviceInfo.isSmallScreen ? 12 : 16,
    },
    headerTitle: {
      ...styles.headerTitle,
      fontSize: deviceInfo.isSmallScreen ? 18 : 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Gerenciar Carteiras</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateWallet}
        >
          <Ionicons name="add-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ResponsiveContainer>
        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Carregando carteiras...</Text>
            </View>
          ) : wallets.length > 0 ? (
            <FlatList
              data={wallets}
              renderItem={renderWalletItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.walletsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color={colors.text.secondary} />
              <Text style={styles.emptyTitle}>Nenhuma carteira encontrada</Text>
              <Text style={styles.emptyText}>
                Crie sua primeira carteira Bitcoin para começar
              </Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={handleCreateWallet}
              >
                <Text style={styles.createFirstButtonText}>Criar Primeira Carteira</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </ResponsiveContainer>

      {/* Modal de Criação de Carteira */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nova Carteira</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {isCreating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={styles.loadingText}>Gerando sua carteira...</Text>
              <Text style={styles.loadingSubtext}>Isso pode levar alguns segundos</Text>
            </View>
          ) : showMnemonic && newWallet ? (
            <ScrollView style={styles.modalContent}>
              {/* Aviso de Segurança */}
              <View style={styles.warningContainer}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={styles.warningTitle}>Importante</Text>
                <Text style={styles.warningText}>
                  Anote seu mnemônico em um local seguro. Se você perder este mnemônico, 
                  perderá acesso permanente aos seus bitcoins.
                </Text>
              </View>

              {/* Mnemônico */}
              <View style={styles.mnemonicContainer}>
                <Text style={styles.mnemonicTitle}>Mnemônico da Carteira</Text>
                <View style={styles.mnemonicWords}>
                  {newWallet.mnemonic.split(' ').map((word: string, index: number) => (
                    <View key={index} style={styles.mnemonicWord}>
                      <Text style={styles.mnemonicWordNumber}>{index + 1}</Text>
                      <Text style={styles.mnemonicWordText}>{word}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Instruções */}
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsTitle}>Como Fazer Backup</Text>
                <Text style={styles.instructionText}>1. Anote as 12 palavras em ordem em um papel</Text>
                <Text style={styles.instructionText}>2. Guarde o papel em um local seguro</Text>
                <Text style={styles.instructionText}>3. Nunca compartilhe seu mnemônico com ninguém</Text>
                <Text style={styles.instructionText}>4. Considere fazer múltiplas cópias em locais diferentes</Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.modalContent}>
              <View style={styles.createWalletContainer}>
                <Text style={styles.createWalletTitle}>Criar Nova Carteira</Text>
                <Text style={styles.createWalletText}>
                  Uma nova carteira Bitcoin será criada com um mnemônico único. 
                  Certifique-se de anotar o mnemônico em local seguro.
                </Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleGenerateWallet}
                >
                  <Text style={styles.createButtonText}>Criar Carteira</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showMnemonic && newWallet && (
            <View style={styles.modalBottomButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryModalButton]}
                onPress={handleBackupLater}
              >
                <Text style={styles.secondaryModalButtonText}>Depois</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.primaryModalButton]}
                onPress={handleConfirmMnemonic}
              >
                <Text style={styles.primaryModalButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
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
  backButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
  },
  backButtonText: {
    fontSize: 20,
    color: colors.text.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  addButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  walletsList: {
    paddingVertical: spacing.md,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  walletInfo: {
    flex: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  activeBadge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  walletAddress: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontFamily: 'monospace',
  },
  walletBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  walletSettings: {
    padding: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  createFirstButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  // Estilos do Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalHeaderSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: 18,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  warningContainer: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e67e22',
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  mnemonicContainer: {
    marginBottom: spacing.lg,
  },
  mnemonicTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  mnemonicWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  mnemonicWord: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  mnemonicWordNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginRight: spacing.sm,
    minWidth: 20,
  },
  mnemonicWordText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  instructionsContainer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  instructionText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  createWalletContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  createWalletTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  createWalletText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  createButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 25,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  modalBottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  secondaryModalButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  primaryModalButton: {
    backgroundColor: colors.primary.main,
  },
  secondaryModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  primaryModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
});
