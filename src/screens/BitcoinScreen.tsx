import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  Modal,
  Linking,
} from 'react-native';
import { colors, spacing } from '../theme';
import { bitcoinService } from '../services/bitcoinService';
import { bitcoinApiService } from '../services/bitcoinApiService';
import { multiWalletService } from '../services/multiWalletService';
import { Ionicons } from '@expo/vector-icons';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import * as Clipboard from 'expo-clipboard';
// import { BackupButton } from '../components/BackupButton';

interface BitcoinScreenProps {
  navigation: any;
}

export const BitcoinScreen: React.FC<BitcoinScreenProps> = ({ navigation }) => {
  const [hasWallet, setHasWallet] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [balanceUnit, setBalanceUnit] = useState<'sats' | 'BTC'>('sats');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [txDetails, setTxDetails] = useState<{ fromAddress?: string; toAddress?: string } | null>(null);
  const [loadingTxDetails, setLoadingTxDetails] = useState(false);
  const [allWallets, setAllWallets] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWallet, setNewWallet] = useState<any>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const deviceInfo = useDeviceInfo();

  useEffect(() => {
    checkWallet();
    loadAllWallets();
  }, []);

  const loadAllWallets = async () => {
    try {
      const wallets = await multiWalletService.loadWallets();
      setAllWallets(wallets);
    } catch (error) {
      console.error('Erro ao carregar carteiras:', error);
    }
  };

  useEffect(() => {
    const fetchTxDetails = async () => {
      if (!selectedTx) {
        setTxDetails(null);
        return;
      }
      try {
        setLoadingTxDetails(true);
        const resp = await fetch(`https://mempool.space/api/tx/${selectedTx.txid}`);
        if (!resp.ok) throw new Error('Falha ao carregar detalhes da transação');
        const data = await resp.json();

        const firstInput = data.vin?.[0];
        const firstOutput = data.vout?.[0];

        const walletAddress = wallet?.addresses?.bech32 || wallet?.addresses?.p2pkh || wallet?.addresses?.p2sh;

        let fromAddress: string | undefined = firstInput?.prevout?.scriptpubkey_address;
        let toAddress: string | undefined = firstOutput?.scriptpubkey_address;

        // Melhor tentativa para identificar destino quando foi "sent": pegar o primeiro vout que não é da carteira
        if (selectedTx.type === 'sent' && Array.isArray(data.vout)) {
          const out = data.vout.find((o: any) => o.scriptpubkey_address && o.scriptpubkey_address !== walletAddress);
          if (out?.scriptpubkey_address) toAddress = out.scriptpubkey_address;
          fromAddress = walletAddress;
        }

        // Quando foi "received": destino é a carteira
        if (selectedTx.type === 'received') {
          toAddress = walletAddress;
        }

        setTxDetails({ fromAddress, toAddress });
      } catch (e) {
        setTxDetails(null);
      } finally {
        setLoadingTxDetails(false);
      }
    };

    fetchTxDetails();
  }, [selectedTx]);

  const checkWallet = async () => {
    try {
      // Migrar carteira atual se necessário
      await multiWalletService.migrateCurrentWallet();
      
      // Obter carteira ativa
      const activeWallet = await multiWalletService.getActiveWallet();
      
      if (activeWallet) {
        setHasWallet(true);
        
        // Carregar carteira do BitcoinService usando o mnemônico
        if (activeWallet.mnemonic) {
          try {
            const loadedWallet = await bitcoinService.instance.restoreWallet(activeWallet.mnemonic);
            if (loadedWallet) {
              setWallet(loadedWallet);
              await checkBackendAndLoadBalance(loadedWallet);
              await loadTransactions(loadedWallet);
            }
          } catch (error) {
            console.error('Erro ao restaurar carteira ativa:', error);
            // Se não conseguir restaurar, assumir que não há carteira
            setHasWallet(false);
            setWallet(null);
          }
        }
      } else {
        setHasWallet(false);
        setWallet(null);
      }
    } catch (error) {
      console.error('Erro ao verificar carteira:', error);
      // Se houver erro, assumir que não há carteira
      setHasWallet(false);
      setWallet(null);
    } finally {
      setIsChecking(false);
      setIsLoading(false);
    }
  };


  const handleRestoreWallet = () => {
    navigation.navigate('RestoreWallet');
  };

  const checkBackendAndLoadBalance = async (currentWallet: any) => {
    try {
      console.log('🔍 Verificando disponibilidade do backend...');
      const isAvailable = await bitcoinService.instance.isBackendAvailable();
      console.log('✅ Backend disponível:', isAvailable);
      setBackendAvailable(isAvailable);
      
      if (isAvailable && currentWallet) {
        // Priorizar Bech32, depois Legacy, depois P2SH
        const walletAddress = currentWallet.addresses.bech32 || currentWallet.addresses.p2pkh || currentWallet.addresses.p2sh;
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
        console.log('Carteira carregada:', !!currentWallet);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar saldo do backend:', error);
    }
  };

  const loadTransactions = async (currentWallet: any) => {
    if (!currentWallet) return;
    
    setLoadingTransactions(true);
    try {
      // Obter endereço da carteira (priorizar Bech32, depois Legacy, depois P2SH)
      const walletAddress = currentWallet.addresses.bech32 || currentWallet.addresses.p2pkh || currentWallet.addresses.p2sh;
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


  const handleLightningPress = () => {
    navigation.navigate('Login');
  };

  const handleSend = () => {
    navigation.navigate('SendBitcoin', { wallet });
  };

  const handleReceive = () => {
    navigation.navigate('ReceiveBitcoin', { wallet });
  };

  const handleCopy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copiado', 'Conteúdo copiado para a área de transferência');
    } catch (e) {}
  };

  const openInMempool = (txid: string) => {
    const url = `https://mempool.space/tx/${txid}`;
    Linking.openURL(url);
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
    const days = Math.floor(diff / (24 * 3600000));
    const hours = Math.floor((diff % (24 * 3600000)) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (days > 0) {
      return `${days} dia${days > 1 ? 's' : ''} atrás`;
    } else if (hours > 0) {
      return `${hours}h atrás`;
    } else if (minutes > 0) {
      return `${minutes}min atrás`;
    } else {
      return 'Agora';
    }
  };

  const handleBitcoinPreferences = () => {
    navigation.navigate('BitcoinPreferences');
  };

  const handleSelectWallet = async (walletId: string) => {
    try {
      // Definir como carteira ativa
      await multiWalletService.setActiveWallet(walletId);
      
      // Recarregar carteira ativa
      await checkWallet();
      await loadAllWallets();
    } catch (error) {
      console.error('Erro ao selecionar carteira:', error);
      Alert.alert('Erro', 'Não foi possível ativar a carteira selecionada.');
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
        name: `Carteira ${allWallets.length + 1}`,
        address: newWallet.addresses?.bech32 || newWallet.addresses?.p2pkh || 'N/A',
        balance: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        mnemonic: newWallet.mnemonic || ''
      };

      await multiWalletService.addWallet(walletInfo);
      console.log('✅ Nova carteira salva:', walletInfo);

      // Recarregar carteiras
      await loadAllWallets();
      await checkWallet();

      // Fechar modal
      setShowCreateModal(false);
      setShowMnemonic(false);
      setNewWallet(null);

      Alert.alert(
        'Carteira Criada!',
        'Sua nova carteira Bitcoin foi criada com sucesso.',
        [{ text: 'OK' }]
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



  const handleDeleteWallet = () => {
    Alert.alert(
      'Deletar Carteira',
      'Tem certeza que deseja deletar sua carteira atual? Esta ação não pode ser desfeita.\n\nCertifique-se de ter anotado seu mnemônico antes de continuar.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await bitcoinService.instance.deleteWallet();
              setHasWallet(false);
              Alert.alert('Sucesso', 'Carteira deletada com sucesso!');
            } catch (error) {
              console.error('Erro ao deletar carteira:', error);
              Alert.alert('Erro', 'Falha ao deletar carteira');
            }
          },
        },
      ]
    );
  };







  if (isChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Verificando carteira...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Se não há carteira, mostrar a tela de criação
  if (!hasWallet) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.bitcoinSection}>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Bem-vindo ao Bitcoin</Text>
              <Text style={styles.welcomeText}>
                Crie sua carteira não-custodial e tenha controle total sobre seus bitcoins.
              </Text>
            </View>
          </View>

          {/* Opções de carteira */}
          <View style={styles.walletOptions}>
            <TouchableOpacity
              style={styles.primaryOption}
              onPress={handleCreateWallet}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryOptionText}>Criar Nova Carteira</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryOption}
              onPress={handleRestoreWallet}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryOptionText}>Restaurar Carteira</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botões na parte inferior */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleCreateWallet}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomButtonText}>₿ Bitcoin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleLightningPress}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomButtonText}>⚡ Lightning</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Se há carteira, mostrar a interface da carteira
  if (!wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Carteira não encontrada</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.navigate('Bitcoin')}
          >
            <Text style={styles.errorButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Estilos dinâmicos baseados no dispositivo
  const dynamicStyles = StyleSheet.create({
    topHeader: {
      ...styles.topHeader,
      paddingTop: deviceInfo.isIPhone11 ? spacing.sm : spacing.md,
      paddingBottom: deviceInfo.isSmallScreen ? spacing.sm : spacing.md,
    },
    title: {
      ...styles.title,
      fontSize: deviceInfo.isSmallScreen ? 20 : 24,
    },
    subtitle: {
      ...styles.subtitle,
      fontSize: deviceInfo.isSmallScreen ? 14 : 16,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com seletor de carteiras */}
      <View style={dynamicStyles.topHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCreateWallet}
        >
          <Ionicons name="add-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={dynamicStyles.title}>
            {wallet ? allWallets.find(w => w.isActive)?.name || 'Carteira Bitcoin' : 'Carteira Bitcoin'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBitcoinPreferences}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cards de Carteiras */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.walletsScrollView}
          contentContainerStyle={styles.walletsScrollContent}
        >
          {allWallets.map((walletItem, index) => (
            <TouchableOpacity
              key={walletItem.id}
              style={[
                styles.walletCard,
                walletItem.isActive && styles.activeWalletCard
              ]}
              onPress={() => handleSelectWallet(walletItem.id)}
            >
              <View style={styles.walletCardHeader}>
                <Text style={[
                  styles.walletCardName,
                  walletItem.isActive && styles.activeWalletCardName
                ]}>
                  {walletItem.name}
                </Text>
                {walletItem.isActive && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary.main} />
                )}
              </View>
              
              <View style={styles.walletCardBalance}>
                <Text style={styles.walletBalanceAmount}>
                  {formatBalance()}
                </Text>
                <Text style={styles.walletBalanceUnit}>
                  {balanceUnit === 'sats' ? 'sats' : 'BTC'}
                </Text>
              </View>

              {balance === 0 && (
                <Text style={styles.walletEmptyText}>
                  Carteira vazia
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Transaction History */}
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Histórico</Text>
          </View>
          {loadingTransactions ? (
            <View style={styles.historyLoading}>
              <Text style={styles.historyLoadingText}>Carregando transações...</Text>
            </View>
          ) : transactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {(showAllTransactions ? transactions : transactions.slice(0, 3)).map((tx) => (
                <TouchableOpacity key={tx.id} style={styles.transactionItem} onPress={() => setSelectedTx(tx)}>
                  <View style={styles.transactionIcon}>
                    <Text style={styles.transactionIconText}>
                      {tx.type === 'received' ? '↓' : '↑'}
                    </Text>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionType}>
                      {(tx.confirmations ?? 0) === 0
                        ? 'Pendente'
                        : tx.type === 'received'
                        ? 'Recebido'
                        : 'Enviado'}
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
                </TouchableOpacity>
              ))}
              {transactions.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setShowAllTransactions(prev => !prev)}
                >
                  <Text style={styles.viewAllText}>
                    {showAllTransactions ? 'Ver menos' : 'Ver todas as transações'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noTransactions}>
              <Text style={styles.noTransactionsText}>Nenhuma transação ainda</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Botões de ação fixos - só aparecem quando há carteira ativa */}
      {wallet && (
        <View style={styles.bottomActionButtons}>
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
      )}

      {/* Modal de detalhes da transação */}
      <Modal
        visible={!!selectedTx}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Detalhes da Transação</Text>

            {loadingTxDetails ? (
              <Text style={styles.modalLoading}>Carregando...</Text>
            ) : (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>De</Text>
                  <View style={styles.detailValueContainer}>
                    <Text style={styles.detailValueFull}>
                      {txDetails?.fromAddress || 'Desconhecido'}
                    </Text>
                    {txDetails?.fromAddress ? (
                      <TouchableOpacity onPress={() => handleCopy(txDetails.fromAddress!)} style={styles.copyBtn}>
                        <Text style={styles.copyBtnText}>Copiar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Para</Text>
                  <View style={styles.detailValueContainer}>
                    <Text style={styles.detailValueFull}>
                      {txDetails?.toAddress || 'Desconhecido'}
                    </Text>
                    {txDetails?.toAddress ? (
                      <TouchableOpacity onPress={() => handleCopy(txDetails.toAddress!)} style={styles.copyBtn}>
                        <Text style={styles.copyBtnText}>Copiar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>TXID</Text>
                  <View style={styles.detailValueContainer}>
                    <Text style={styles.detailValueFull}>
                      {selectedTx?.txid}
                    </Text>
                    {selectedTx?.txid ? (
                      <TouchableOpacity onPress={() => handleCopy(selectedTx.txid)} style={styles.copyBtn}>
                        <Text style={styles.copyBtnText}>Copiar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity style={styles.mempoolButton} onPress={() => selectedTx && openInMempool(selectedTx.txid)}>
                  <Text style={styles.mempoolButtonText}>Ver na mempool</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedTx(null)}>
                <Text style={styles.modalCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Modal de Criação de Carteira */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="fullScreen"
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
  content: {
    flex: 1,
    paddingHorizontal: Math.max(16, spacing.screenPadding * 0.8),
    paddingVertical: Math.max(10, spacing.screenPadding * 0.4),
    justifyContent: 'center',
  },
  bitcoinSection: {
    alignItems: 'center',
  },
  bitcoinTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  bitcoinSubtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  walletExistsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  walletExistsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.sm,
  },
  walletExistsText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  welcomeCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  walletOptions: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  primaryOption: {
    backgroundColor: colors.primary.main,
    borderRadius: 25,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  secondaryOption: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 25,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  secondaryOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 30,
    backgroundColor: colors.background.secondary,
  },
  bottomButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: spacing.sm,
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  // Novos estilos para a interface da carteira
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
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
    paddingBottom: 120, // Espaço para os botões de ação
  },
  // Estilos dos cards de carteiras
  walletsScrollView: {
    marginBottom: spacing.lg,
  },
  walletsScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  walletCard: {
    width: 280,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.lg,
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeWalletCard: {
    borderColor: colors.primary.main,
    backgroundColor: colors.background.tertiary,
  },
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  walletCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  activeWalletCardName: {
    color: colors.primary.main,
  },
  walletCardBalance: {
    marginBottom: spacing.lg,
  },
  walletBalanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  walletBalanceUnit: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  walletEmptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  balanceCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
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
  bottomActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: 'transparent',
  },
  actionButton: {
    alignItems: 'center',
    padding: spacing.sm,
    minWidth: 80,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconText: {
    fontSize: 24,
    color: colors.text.onPrimary,
    fontWeight: '600',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalLoading: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  modalBody: {
    gap: spacing.md,
  },
  detailRow: {
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  detailValueContainer: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
    padding: spacing.sm,
    borderRadius: 8,
  },
  detailValueFull: {
    flex: 1,
    fontSize: 12,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  copyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignSelf: 'flex-start',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  mempoolButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  mempoolButtonText: {
    color: colors.text.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  modalCloseButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  modalCloseText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos dos novos modais
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
  modalHeaderSpacer: {
    width: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  // Estilos do modal de criação
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
