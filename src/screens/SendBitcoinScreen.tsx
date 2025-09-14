import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { bitcoinService, BitcoinWallet, FeeEstimate, FeePriority, FeeValidationResult, FeeValidationContext } from '../services/bitcoinService';
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
  
  // Custom fee states
  const [customFeeRate, setCustomFeeRate] = useState('');
  const [showCustomFee, setShowCustomFee] = useState(false);
  const [feeEstimates, setFeeEstimates] = useState<FeeEstimate[]>([]);
  const [selectedFeePriority, setSelectedFeePriority] = useState<FeePriority>(FeePriority.STANDARD);
  
  // Fee validation states
  const [feeValidation, setFeeValidation] = useState<FeeValidationResult | null>(null);
  const [showFeeValidation, setShowFeeValidation] = useState(false);
  
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
      const isAvailable = await bitcoinService.instance.isBackendAvailable();
      setBackendAvailable(isAvailable);
      console.log('Backend disponível:', isAvailable);
      
      if (isAvailable) {
        const fees = await bitcoinService.instance.getNetworkFees();
        setNetworkFees(fees);
        console.log('Taxas da rede carregadas:', fees);
        console.log('Taxas detalhadas:', {
          economy: fees.economy_fee,
          hour: fees.hour_fee,
          fastest: fees.fastest_fee
        });
        
        // Carregar estimativas detalhadas
        const estimates = await bitcoinService.instance.getDetailedFeeEstimates();
        setFeeEstimates(estimates);
        console.log('Estimativas detalhadas carregadas:', estimates);
      }
    } catch (error) {
      console.error('Erro ao carregar taxas da rede:', error);
    }
  };

  const loadWallet = async () => {
    try {
      const loadedWallet = await bitcoinService.instance.loadWallet();
      if (loadedWallet) {
        setWallet(loadedWallet);
        
        // Obter saldo real da carteira (priorizar Bech32, depois Legacy, depois P2SH)
        const walletAddress = loadedWallet.addresses.bech32 || loadedWallet.addresses.p2pkh || loadedWallet.addresses.p2sh;
        if (walletAddress) {
          try {
            console.log('🔍 Obtendo saldo real da carteira...');
            const balanceData = await bitcoinService.instance.getAddressBalance(walletAddress);
            const balanceInBTC = balanceData.balance / 100000000; // Converter sats para BTC
            setBalance(balanceInBTC);
            console.log('✅ Saldo real carregado:', balanceInBTC, 'BTC');
          } catch (error) {
            console.log('⚠️ Erro ao obter saldo real:', error);
            // Tentar novamente após um delay
            setTimeout(async () => {
              try {
                const balanceData = await bitcoinService.instance.getAddressBalance(walletAddress);
                const balanceInBTC = balanceData.balance / 100000000;
                setBalance(balanceInBTC);
                console.log('✅ Saldo carregado na segunda tentativa:', balanceInBTC, 'BTC');
              } catch (retryError) {
                console.log('⚠️ Falha na segunda tentativa:', retryError);
                setBalance(0);
              }
            }, 2000);
          }
        } else {
          console.log('⚠️ Endereço da carteira não encontrado');
          setBalance(0);
        }
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
    // Obter endereço da carteira para determinar o tipo
    const fromAddress = wallet?.addresses.bech32 || wallet?.addresses.p2pkh || wallet?.addresses.p2sh;
    if (!fromAddress) return 0;
    
    // Determinar tipo de endereço
    const addressType = fromAddress.startsWith('bc1') ? 'p2wpkh' : 
                       fromAddress.startsWith('3') ? 'p2sh' : 'p2pkh';
    
    // Obter tamanho estimado da transação (vSize para SegWit)
    const { vSize } = bitcoinService.instance.getEstimatedTransactionSize(addressType);
    
    // Se taxa customizada está ativa
    if (selectedFeePriority === FeePriority.CUSTOM && customFeeRate) {
      const customRate = parseFloat(customFeeRate);
      if (!isNaN(customRate) && customRate > 0) {
        const calculatedFee = vSize * customRate;
        console.log(`Calculando taxa customizada: ${customRate} sat/vbyte × ${vSize} vbytes = ${calculatedFee} sats`);
        return calculatedFee;
      }
    }
    
    // Usar o novo sistema de prioridade
    const feeRateValue = bitcoinService.instance.calculateOptimalFee(
      selectedFeePriority,
      parseFloat(customFeeRate) || undefined,
      networkFees
    );
    
    const calculatedFee = vSize * feeRateValue;
    console.log(`Calculando taxa: ${selectedFeePriority} = ${feeRateValue} sat/vbyte × ${vSize} vbytes = ${calculatedFee} sats`);
    return calculatedFee;
  };

  const updateCalculations = () => {
    if (!amount) {
      setEstimatedFee(0);
      setTotalAmount(0);
      setFeeValidation(null);
      setShowFeeValidation(false);
      return;
    }

    const amountInSats = convertAmount(amount, amountUnit, 'sats');
    const fee = calculateFee(amountInSats);
    const total = amountInSats + fee;

    setEstimatedFee(fee);
    setTotalAmount(total);

    // Validar taxa customizada em tempo real
    if (selectedFeePriority === FeePriority.CUSTOM && customFeeRate) {
      const customRate = parseFloat(customFeeRate);
      if (!isNaN(customRate) && customRate > 0) {
        // Obter endereço da carteira para determinar o tipo
        const fromAddress = wallet?.addresses.bech32 || wallet?.addresses.p2pkh || wallet?.addresses.p2sh;
        const addressType = fromAddress?.startsWith('bc1') ? 'p2wpkh' : 
                           fromAddress?.startsWith('3') ? 'p2sh' : 'p2pkh';
        
        const { vSize } = bitcoinService.instance.getEstimatedTransactionSize(addressType);
        
        const context: FeeValidationContext = {
          amount: amountInSats,
          txSize: 250,
          txVSize: vSize,
          addressType,
          networkFees,
          urgency: 'medium'
        };
        
        const validation = bitcoinService.instance.validateFeeComprehensive(customRate, context);
        setFeeValidation(validation);
        setShowFeeValidation(true);
      } else {
        setFeeValidation(null);
        setShowFeeValidation(false);
      }
    } else {
      setFeeValidation(null);
      setShowFeeValidation(false);
    }
  };

  useEffect(() => {
    updateCalculations();
  }, [amount, amountUnit, feeRate, selectedFeePriority, customFeeRate]);

  const validateForm = async (): Promise<boolean> => {
    if (!recipientAddress.trim()) {
      Alert.alert('Erro', 'Por favor, informe o endereço do destinatário');
      return false;
    }

    // Validar endereço localmente primeiro
    if (!bitcoinService.instance.validateAddress(recipientAddress)) {
      Alert.alert('Erro', 'Endereço Bitcoin inválido');
      return false;
    }

    // Validação do backend desabilitada - usar apenas validação local
    // O backend valida se o endereço "existe" na blockchain, não se é válido
    // Para endereços novos ou não utilizados, isso pode falhar incorretamente
    console.log('✅ Usando apenas validação local (backend desabilitado para validação)');

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

    // Validar taxa customizada se estiver ativa
    if (selectedFeePriority === FeePriority.CUSTOM && customFeeRate) {
      const customRate = parseFloat(customFeeRate);
      if (isNaN(customRate) || customRate <= 0) {
        Alert.alert('Erro', 'Taxa customizada deve ser um número maior que zero');
        return false;
      }
      
      const context: FeeValidationContext = {
        amount: amountInSats,
        txSize: 250,
        networkFees,
        urgency: 'medium'
      };
      
      const validation = bitcoinService.instance.validateFeeComprehensive(customRate, context);
      if (!validation.isValid) {
        Alert.alert('Erro', validation.message || 'Taxa customizada inválida');
        return false;
      }
      
      // Mostrar aviso se houver
      if (validation.warning && validation.severity === 'warning') {
        Alert.alert(
          'Aviso',
          validation.warning,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => {} }
          ]
        );
      }
    }

    return true;
  };

  const handleSend = async () => {
    if (!(await validateForm())) return;

    setSending(true);
    try {
      console.log('🚀 Enviando transação Bitcoin...');
      
        // Obter endereço da carteira (priorizar Bech32, depois Legacy, depois P2SH)
        const fromAddress = wallet?.addresses.bech32 || wallet?.addresses.p2pkh || wallet?.addresses.p2sh;
        if (!fromAddress) {
          throw new Error('Endereço da carteira não encontrado');
        }
        
        console.log('🔍 [FROM ADDRESS] Enviando de:', fromAddress);

      // Converter valor para satoshis
      const amountInSats = amountUnit === 'BTC' 
        ? Math.round(parseFloat(amount) * 100000000)
        : Math.round(parseFloat(amount));
      
      // Obter taxa selecionada usando o novo sistema
      const feeRateValue = bitcoinService.instance.calculateOptimalFee(
        selectedFeePriority,
        parseFloat(customFeeRate) || undefined,
        networkFees
      );
      
      console.log('📊 Dados da transação:', {
        from: fromAddress,
        to: recipientAddress,
        amount: amountInSats,
        amountUnit,
        feeRate: feeRateValue,
        networkFees: networkFees ? 'Usando taxas reais' : 'Usando taxas fixas'
      });

      // Verificar se há saldo suficiente
      const currentBalanceInSats = Math.round(balance * 100000000);
      if (amountInSats > currentBalanceInSats) {
        throw new Error(`Saldo insuficiente. Disponível: ${formatAmount(currentBalanceInSats)}, Solicitado: ${formatAmount(amountInSats)}`);
      }

      // Enviar transação usando o serviço
      const txid = await bitcoinService.instance.sendTransaction(
        fromAddress,
        recipientAddress,
        amountInSats,
        feeRateValue
      );
      
      console.log('✅ Transação enviada com sucesso:', txid);
      
      const mempoolUrl = `https://mempool.space/tx/${txid}`;
      Alert.alert(
        'Sucesso!',
        `Transação enviada com sucesso!\n\nTXID: ${txid}\n\nVocê pode acompanhar na mempool: ${mempoolUrl}`,
        [
          {
            text: 'Ver na mempool',
            onPress: () => Linking.openURL(mempoolUrl),
          },
          {
            text: 'OK',
            onPress: () => {
              // Recarregar saldo após transação
              loadWallet();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Erro ao enviar transação:', error);
      
      // Tratar erros específicos
      let errorMessage = error.message;
      if (error.message.includes('inputs-missingorspent')) {
        errorMessage = 'UTXO já foi gasto. Tente novamente em alguns segundos.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Saldo insuficiente para esta transação.';
      } else if (error.message.includes('bad-txns')) {
        errorMessage = 'Erro na estrutura da transação. Tente novamente.';
      }
      
      Alert.alert('Erro', `Falha ao enviar transação:\n\n${errorMessage}`);
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
          
          {/* Taxa Customizada Toggle */}
          <TouchableOpacity
            style={styles.customFeeToggle}
            onPress={() => setShowCustomFee(!showCustomFee)}
          >
            <Text style={styles.customFeeToggleText}>
              {showCustomFee ? 'Ocultar Taxa Customizada' : 'Taxa Customizada'}
            </Text>
            <Ionicons 
              name={showCustomFee ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.primary.main} 
            />
          </TouchableOpacity>

          {/* Taxa Customizada Input */}
          {showCustomFee && (
            <View style={styles.customFeeContainer}>
              <Text style={styles.customFeeLabel}>Taxa Customizada (sat/vbyte)</Text>
              <TextInput
                style={styles.customFeeInput}
                placeholder="Ex: 15"
                value={customFeeRate}
                onChangeText={(text) => {
                  setCustomFeeRate(text);
                  setSelectedFeePriority(FeePriority.CUSTOM);
                }}
                keyboardType="numeric"
                placeholderTextColor={colors.text.tertiary}
              />
              {customFeeRate && (
                <Text style={styles.feeEstimateText}>
                  Tempo estimado: {bitcoinService.instance.estimateConfirmationTime(parseFloat(customFeeRate) || 0)}
                </Text>
              )}
              
              {/* Validação em tempo real */}
              {showFeeValidation && feeValidation && (
                <View style={[
                  styles.validationContainer,
                  feeValidation.severity === 'error' && styles.validationError,
                  feeValidation.severity === 'warning' && styles.validationWarning,
                  feeValidation.severity === 'info' && styles.validationInfo
                ]}>
                  <Ionicons 
                    name={
                      feeValidation.severity === 'error' ? 'alert-circle' :
                      feeValidation.severity === 'warning' ? 'warning' : 'checkmark-circle'
                    } 
                    size={16} 
                    color={
                      feeValidation.severity === 'error' ? colors.error.main :
                      feeValidation.severity === 'warning' ? colors.warning.main : colors.success.main
                    } 
                  />
                  <View style={styles.validationContent}>
                    {feeValidation.message && (
                      <Text style={[
                        styles.validationMessage,
                        feeValidation.severity === 'error' && styles.validationMessageError,
                        feeValidation.severity === 'warning' && styles.validationMessageWarning
                      ]}>
                        {feeValidation.message}
                      </Text>
                    )}
                    {feeValidation.warning && (
                      <Text style={styles.validationWarning}>
                        {feeValidation.warning}
                      </Text>
                    )}
                    {feeValidation.suggestedRate && (
                      <TouchableOpacity
                        style={styles.suggestedRateButton}
                        onPress={() => setCustomFeeRate(feeValidation.suggestedRate!.toString())}
                      >
                        <Text style={styles.suggestedRateText}>
                          Usar taxa sugerida: {feeValidation.suggestedRate} sat/vbyte
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
              
              <Text style={styles.feeHelpText}>
                Taxa mais alta = confirmação mais rápida
              </Text>
            </View>
          )}

          {/* Taxa Preset Options */}
          {!showCustomFee && (
            <View style={styles.feeRateContainer}>
              {feeEstimates.map((estimate, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.feeRateButton,
                    selectedFeePriority === estimate.priority && styles.feeRateButtonSelected,
                  ]}
                  onPress={() => {
                    console.log(`Selecionando taxa ${estimate.priority}: ${estimate.satPerVByte} sat/vbyte`);
                    setSelectedFeePriority(estimate.priority as FeePriority);
                    setCustomFeeRate(''); // Limpar taxa customizada
                  }}
                >
                  <Text
                    style={[
                      styles.feeRateText,
                      selectedFeePriority === estimate.priority && styles.feeRateTextSelected,
                    ]}
                  >
                    {estimate.description}
                  </Text>
                  <Text
                    style={[
                      styles.feeRateSubtext,
                      selectedFeePriority === estimate.priority && styles.feeRateSubtextSelected,
                    ]}
                  >
                    {estimate.satPerVByte} sat/vbyte
                  </Text>
                  <Text
                    style={[
                      styles.feeRateTime,
                      selectedFeePriority === estimate.priority && styles.feeRateTimeSelected,
                    ]}
                  >
                    {estimate.estimatedTime}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Smart Fee Suggestion */}
          {amount && (
            <View style={styles.smartSuggestionContainer}>
              <Ionicons name="bulb-outline" size={16} color={colors.warning.main} />
              <Text style={styles.smartSuggestionText}>
                {bitcoinService.instance.getSmartFeeSuggestion(
                  convertAmount(amount, amountUnit, 'sats'),
                  networkFees
                )}
              </Text>
            </View>
          )}

          {/* Fee Security Information */}
          {amount && (selectedFeePriority === FeePriority.CUSTOM || showCustomFee) && (
            <View style={styles.feeSecurityContainer}>
              <Text style={styles.feeSecurityTitle}>🛡️ Informações de Segurança</Text>
              
              {(() => {
                const amountInSats = convertAmount(amount, amountUnit, 'sats');
                const currentRate = selectedFeePriority === FeePriority.CUSTOM && customFeeRate 
                  ? parseFloat(customFeeRate) 
                  : bitcoinService.instance.calculateOptimalFee(selectedFeePriority, undefined, networkFees);
                const estimatedFee = currentRate * 250;
                const feePercentage = (estimatedFee / amountInSats) * 100;
                const minSafeFee = bitcoinService.instance.calculateMinimumSafeFee(amountInSats);
                
                return (
                  <View style={styles.feeSecurityInfo}>
                    <View style={styles.feeSecurityRow}>
                      <Text style={styles.feeSecurityLabel}>Taxa atual:</Text>
                      <Text style={styles.feeSecurityValue}>{currentRate} sat/vbyte</Text>
                    </View>
                    
                    <View style={styles.feeSecurityRow}>
                      <Text style={styles.feeSecurityLabel}>Taxa mínima segura:</Text>
                      <Text style={styles.feeSecurityValue}>{minSafeFee} sat/vbyte</Text>
                    </View>
                    
                    <View style={styles.feeSecurityRow}>
                      <Text style={styles.feeSecurityLabel}>% do valor:</Text>
                      <Text style={[
                        styles.feeSecurityValue,
                        feePercentage > 20 && styles.feeSecurityValueWarning,
                        feePercentage > 50 && styles.feeSecurityValueError
                      ]}>
                        {feePercentage.toFixed(1)}%
                      </Text>
                    </View>
                    
                    <View style={styles.feeSecurityRow}>
                      <Text style={styles.feeSecurityLabel}>Status:</Text>
                      <Text style={[
                        styles.feeSecurityValue,
                        currentRate >= minSafeFee ? styles.feeSecurityValueSuccess : styles.feeSecurityValueWarning
                      ]}>
                        {currentRate >= minSafeFee ? '✅ Seguro' : '⚠️ Baixo'}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          )}
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
  feeRateTime: {
    fontSize: 10,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  feeRateTimeSelected: {
    color: colors.text.onPrimary,
  },
  customFeeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  customFeeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  customFeeContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  customFeeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  customFeeInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 8,
  },
  feeEstimateText: {
    fontSize: 12,
    color: colors.info.main,
    marginBottom: 4,
  },
  feeHelpText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  smartSuggestionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  smartSuggestionText: {
    flex: 1,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  validationError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.error.main,
  },
  validationWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: colors.warning.main,
  },
  validationInfo: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: colors.info.main,
  },
  validationContent: {
    flex: 1,
  },
  validationMessage: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  validationMessageError: {
    color: colors.error.main,
  },
  validationMessageWarning: {
    color: colors.warning.main,
  },
  suggestedRateButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  suggestedRateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  feeSecurityContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  feeSecurityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  feeSecurityInfo: {
    gap: 8,
  },
  feeSecurityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeSecurityLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    flex: 1,
  },
  feeSecurityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  feeSecurityValueSuccess: {
    color: colors.success.main,
  },
  feeSecurityValueWarning: {
    color: colors.warning.main,
  },
  feeSecurityValueError: {
    color: colors.error.main,
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
