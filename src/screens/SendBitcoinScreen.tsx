import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { bitcoinService, BitcoinWallet } from '../services/bitcoinService';
import { colors } from '../theme/colors';

interface SendBitcoinScreenProps {
  navigation: any;
  route: any;
}

export const SendBitcoinScreen: React.FC<SendBitcoinScreenProps> = ({ navigation, route }) => {
  const [wallet, setWallet] = useState<BitcoinWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form fields
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [amountUnit, setAmountUnit] = useState<'BTC' | 'sats'>('BTC');
  const [feeRate, setFeeRate] = useState('medium');
  const [memo, setMemo] = useState('');
  
  // Calculated values
  const [estimatedFee, setEstimatedFee] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [networkFees, setNetworkFees] = useState<any>(null);
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    loadWallet();
    checkBackendAndLoadFees();
  }, []);

  const checkBackendAndLoadFees = async () => {
    try {
      const isAvailable = await bitcoinService.isBackendAvailable();
      setBackendAvailable(isAvailable);
      console.log('Backend disponível:', isAvailable);
      
      if (isAvailable) {
        const fees = await bitcoinService.getNetworkFees();
        setNetworkFees(fees);
        console.log('Taxas da rede carregadas:', fees);
        console.log('Taxas detalhadas:', {
          economy: fees.economy_fee,
          hour: fees.hour_fee,
          fastest: fees.fastest_fee
        });
      }
    } catch (error) {
      console.error('Erro ao carregar taxas da rede:', error);
    }
  };

  const loadWallet = async () => {
    try {
      const loadedWallet = await bitcoinService.loadWallet();
      if (loadedWallet) {
        setWallet(loadedWallet);
        // Simular saldo para demonstração
        setBalance(0.001); // 0.001 BTC = 100,000 sats
      } else {
        Alert.alert('Erro', 'Carteira não encontrada');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Erro ao carregar carteira:', error);
      Alert.alert('Erro', 'Falha ao carregar carteira');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const convertAmount = (value: string, fromUnit: 'BTC' | 'sats', toUnit: 'BTC' | 'sats'): number => {
    const numValue = parseFloat(value) || 0;
    if (fromUnit === toUnit) return numValue;
    
    if (fromUnit === 'BTC' && toUnit === 'sats') {
      return numValue * 100000000;
    } else if (fromUnit === 'sats' && toUnit === 'BTC') {
      return numValue / 100000000;
    }
    return 0;
  };

  const calculateFee = (amountInSats: number): number => {
    // Se temos taxas reais do backend, usar elas
    if (networkFees) {
      const feeRates = {
        slow: networkFees.economy_fee || 1,
        medium: networkFees.hour_fee || 5,
        fast: networkFees.fastest_fee || 10,
      };
      
      // Transação típica: ~250 bytes
      const txSize = 250;
      const selectedRate = feeRates[feeRate as keyof typeof feeRates];
      const calculatedFee = txSize * selectedRate;
      
      console.log(`Calculando taxa: ${feeRate} = ${selectedRate} sat/byte × ${txSize} bytes = ${calculatedFee} sats`);
      return calculatedFee;
    }
    
    // Fallback para taxas estimadas
    const txSize = 250;
    const fallbackRates = {
      slow: 1,    // 1 sat/byte
      medium: 5,  // 5 sat/byte
      fast: 10,   // 10 sat/byte
    };
    
    const selectedRate = fallbackRates[feeRate as keyof typeof fallbackRates];
    const calculatedFee = txSize * selectedRate;
    console.log(`Usando taxa fallback: ${feeRate} = ${selectedRate} sat/byte × ${txSize} bytes = ${calculatedFee} sats`);
    return calculatedFee;
  };

  const updateCalculations = () => {
    if (!amount) {
      setEstimatedFee(0);
      setTotalAmount(0);
      return;
    }

    const amountInSats = convertAmount(amount, amountUnit, 'sats');
    const fee = calculateFee(amountInSats);
    const total = amountInSats + fee;

    setEstimatedFee(fee);
    setTotalAmount(total);
  };

  useEffect(() => {
    updateCalculations();
  }, [amount, amountUnit, feeRate]);

  const validateForm = async (): Promise<boolean> => {
    if (!recipientAddress.trim()) {
      Alert.alert('Erro', 'Por favor, informe o endereço do destinatário');
      return false;
    }

    // Validar endereço localmente primeiro
    if (!bitcoinService.validateAddress(recipientAddress)) {
      Alert.alert('Erro', 'Endereço Bitcoin inválido');
      return false;
    }

    // Se o backend estiver disponível, validar também lá
    if (backendAvailable) {
      try {
        const isValid = await bitcoinService.validateAddressWithBackend(recipientAddress);
        if (!isValid) {
          Alert.alert('Erro', 'Endereço Bitcoin inválido');
          return false;
        }
      } catch (error) {
        console.error('Erro na validação do backend:', error);
        // Continuar com validação local se o backend falhar
      }
    }

    if (!amount.trim()) {
      Alert.alert('Erro', 'Por favor, informe o valor a ser enviado');
      return false;
    }

    const amountInSats = convertAmount(amount, amountUnit, 'sats');
    if (amountInSats <= 0) {
      Alert.alert('Erro', 'Valor deve ser maior que zero');
      return false;
    }

    const balanceInSats = convertAmount(balance.toString(), 'BTC', 'sats');
    if (totalAmount > balanceInSats) {
      Alert.alert('Erro', 'Saldo insuficiente');
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!(await validateForm())) return;

    setSending(true);
    try {
      // Aqui seria implementada a lógica real de envio
      // Por enquanto, apenas simular o envio
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Sucesso',
        'Transação enviada com sucesso!\n\nEm produção, a transação seria assinada e transmitida para a rede Bitcoin.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao enviar transação:', error);
      Alert.alert('Erro', 'Falha ao enviar transação');
    } finally {
      setSending(false);
    }
  };

  const formatAmount = (sats: number): string => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(8)} BTC`;
    } else {
      return `${sats.toLocaleString()} sats`;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando carteira...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Carteira não encontrada</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enviar Bitcoin</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Saldo Disponível</Text>
          <Text style={styles.balanceAmount}>{formatAmount(convertAmount(balance.toString(), 'BTC', 'sats'))}</Text>
          
          {/* Backend Status */}
          <View style={styles.backendStatusContainer}>
            <View style={[styles.statusDot, { backgroundColor: backendAvailable ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>
              {backendAvailable ? 'Conectado à rede Bitcoin' : 'Modo offline'}
            </Text>
          </View>
        </View>

        {/* Recipient Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço do Destinatário</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Digite o endereço Bitcoin"
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valor</Text>
          <View style={styles.amountContainer}>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00000000"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.unitButton}
              onPress={() => setAmountUnit(amountUnit === 'BTC' ? 'sats' : 'BTC')}
            >
              <Text style={styles.unitButtonText}>{amountUnit}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fee Rate */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taxa de Rede</Text>
          <View style={styles.feeRateContainer}>
            {(['slow', 'medium', 'fast'] as const).map((rate) => {
              const getFeeRate = () => {
                if (networkFees) {
                  switch (rate) {
                    case 'slow': return networkFees.economy_fee || 1;
                    case 'medium': return networkFees.hour_fee || 5;
                    case 'fast': return networkFees.fastest_fee || 10;
                    default: return 1;
                  }
                }
                return rate === 'slow' ? 1 : rate === 'medium' ? 5 : 10;
              };
              
              const currentFeeRate = getFeeRate();
              
              return (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.feeRateButton,
                    feeRate === rate && styles.feeRateButtonSelected,
                  ]}
                  onPress={() => {
                    console.log(`Selecionando taxa ${rate}: ${currentFeeRate} sat/byte`);
                    setFeeRate(rate);
                  }}
                >
                  <Text
                    style={[
                      styles.feeRateText,
                      feeRate === rate && styles.feeRateTextSelected,
                    ]}
                  >
                    {rate === 'slow' ? 'Lenta' : rate === 'medium' ? 'Média' : 'Rápida'}
                  </Text>
                  <Text
                    style={[
                      styles.feeRateSubtext,
                      feeRate === rate && styles.feeRateSubtextSelected,
                    ]}
                  >
                    {currentFeeRate} sat/byte
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Memo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Memo (opcional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Descrição da transação"
            value={memo}
            onChangeText={setMemo}
            multiline
          />
        </View>

        {/* Transaction Summary */}
        {amount && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Resumo da Transação</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Valor:</Text>
              <Text style={styles.summaryValue}>{formatAmount(convertAmount(amount, amountUnit, 'sats'))}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxa estimada:</Text>
              <Text style={styles.summaryValue}>{formatAmount(estimatedFee)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total:</Text>
              <Text style={styles.summaryTotalValue}>{formatAmount(totalAmount)}</Text>
            </View>
          </View>
        )}

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!amount || !recipientAddress || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!amount || !recipientAddress || sending}
        >
          {sending ? (
            <Text style={styles.sendButtonText}>Enviando...</Text>
          ) : (
            <Text style={styles.sendButtonText}>Enviar Bitcoin</Text>
          )}
        </TouchableOpacity>

        {/* Warning */}
        <View style={styles.warningContainer}>
          <Ionicons name="warning-outline" size={20} color={colors.warning.main} />
          <Text style={styles.warningText}>
            Verifique cuidadosamente o endereço antes de enviar. Transações Bitcoin são irreversíveis.
          </Text>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary.main,
    fontWeight: '600',
  },
  balanceContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  backendStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 50,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  amountInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderLeftWidth: 1,
    borderLeftColor: colors.border.light,
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
  },
  feeRateContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  feeRateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  feeRateButtonSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  feeRateText: {
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'center',
  },
  feeRateTextSelected: {
    color: colors.text.onPrimary,
  },
  feeRateSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
  feeRateSubtextSelected: {
    color: colors.text.onPrimary,
  },
  summaryContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: 12,
    marginTop: 8,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sendButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.disabled,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
