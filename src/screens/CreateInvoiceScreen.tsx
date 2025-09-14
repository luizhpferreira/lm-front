import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { colors, spacing, typography } from '../theme';
import { useDeviceInfo } from '../hooks/useDeviceInfo';

interface CreateInvoiceScreenProps {
  navigation: any;
}

export const CreateInvoiceScreen: React.FC<CreateInvoiceScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [qrCodeError, setQrCodeError] = useState<boolean>(false);
  const qrCodeRef = useRef<any>(null);
  const deviceInfo = useDeviceInfo();

  const handleCreateInvoice = async () => {
    if (!amount.trim()) {
      Alert.alert('Erro', 'Por favor, informe o valor do invoice.');
      return;
    }

    const amountNumber = parseInt(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Erro', 'Por favor, informe um valor válido maior que zero.');
      return;
    }

    if (amountNumber > 1000000000) { // Limite de 1 BTC em sats
      Alert.alert('Erro', 'Valor muito alto. Máximo permitido: 1,000,000,000 sats (1 BTC)');
      return;
    }

    setLoading(true);
    try {
      console.log('Enviando valor para API:', amountNumber);
      const response = await apiService.createInvoice({
        amount: amountNumber, // Usar sats diretamente
        memo: memo.trim() || 'Invoice criado via app',
      });
      
      if (response.success && response.data) {
        console.log('Valor recebido da API:', response.data.amount);
      }

      if (response.success && response.data) {
        setCreatedInvoice(response.data);
        setInvoiceAmount(amount); // Salvar o valor digitado pelo usuário
        setQrCodeError(false); // Resetar erro do QR Code
        setAmount('');
        setMemo('');
      } else {
        Alert.alert('Erro', response.message || 'Erro ao criar invoice');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvoice = async () => {
    if (createdInvoice?.payment_request) {
      try {
        await Clipboard.setStringAsync(createdInvoice.payment_request);
        Alert.alert('Sucesso', 'Invoice copiado com sucesso!');
      } catch (error) {
        Alert.alert('Erro', 'Erro ao copiar para a área de transferência');
      }
    }
  };

  const handleClearInvoice = () => {
    setCreatedInvoice(null);
    setInvoiceAmount('');
  };



  // Estilos dinâmicos baseados no dispositivo
  const dynamicStyles = StyleSheet.create({
    header: {
      ...styles.header,
      paddingVertical: deviceInfo.isSmallScreen ? 12 : 16,
    },
    cardTitle: {
      ...styles.cardTitle,
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

        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={dynamicStyles.cardTitle}>Novo Pagamento</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Valor (sats)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="1000"
              keyboardType="numeric"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mensagem (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={memo}
              onChangeText={setMemo}
              placeholder="Mensagem (opcional)"
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateInvoice}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.createButtonText}>Criar Pagamento</Text>
            )}
          </TouchableOpacity>
        </View>

        {createdInvoice && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✅ Pagamento criado</Text>
            
            <View style={styles.invoiceInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Valor:</Text>
                <Text style={styles.infoValue}>{invoiceAmount} sats</Text>
              </View>
              
              {createdInvoice.memo && createdInvoice.memo !== 'Invoice criado via app' && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mensagem:</Text>
                  <Text style={styles.infoValue}>{createdInvoice.memo}</Text>
                </View>
              )}
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hash:</Text>
                <Text style={styles.infoValue}>{createdInvoice.payment_hash}</Text>
              </View>
            </View>

            {/* QR Code Section */}
            <View style={styles.qrCodeContainer}>
              <Text style={styles.qrCodeLabel}>📱 QR Code para Pagamento:</Text>
              <View style={styles.qrCodeWrapper}>
                {!qrCodeError ? (
                  <QRCode
                    ref={qrCodeRef}
                    value={createdInvoice.payment_request}
                    size={200}
                    color={colors.text.primary}
                    backgroundColor={colors.background.primary}
                    onError={(error: any) => {
                      console.error('Erro ao gerar QR Code:', error);
                      setQrCodeError(true);
                    }}
                  />
                ) : (
                  <View style={styles.qrCodeErrorContainer}>
                    <Text style={styles.qrCodeErrorText}>⚠️ Erro ao gerar QR Code</Text>
                    <Text style={styles.qrCodeErrorSubtext}>
                      Use o ID do pagamento abaixo para pagar
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.qrCodeInfo}>
                {qrCodeError 
                  ? 'Copie o ID do pagamento e use em qualquer app Lightning'
                  : 'Escaneie este QR code com qualquer app Lightning para pagar'
                }
              </Text>
            </View>

            <View style={styles.paymentRequestContainer}>
              <Text style={styles.paymentRequestLabel}>Id do pagamento:</Text>
              <View style={styles.paymentRequestBox}>
                <Text style={styles.paymentRequestText} selectable={true}>
                  {createdInvoice.payment_request}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyInvoice}
                activeOpacity={0.8}
              >
                <Text style={styles.copyButtonText}>Copiar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearInvoice}
                activeOpacity={0.8}
              >
                <Text style={styles.clearButtonText}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  backButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
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
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.inputPadding,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 25, // Formato de cápsula
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 45, // Botão menor
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  invoiceInfo: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  paymentRequestContainer: {
    marginBottom: spacing.lg,
  },
  paymentRequestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  paymentRequestBox: {
    backgroundColor: colors.background.tertiary,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  paymentRequestText: {
    fontSize: 12,
    color: colors.text.primary,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  copyButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    borderRadius: 25, // Formato de cápsula
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: '45%',
    minHeight: 45, // Botão menor
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  copyButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  copyQRButton: {
    flex: 1,
    backgroundColor: colors.info.main,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.buttonPadding,
    alignItems: 'center',
    minWidth: '45%',
  },
  copyQRButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.secondary.main,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.buttonPadding,
    alignItems: 'center',
    minWidth: '45%',
  },
  shareButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.error.main,
    borderRadius: 25, // Formato de cápsula
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: '45%',
    minHeight: 45, // Botão menor
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  qrCodeWrapper: {
    backgroundColor: colors.background.tertiary,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  qrCodeInfo: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: spacing.borderRadius.md,
  },
  qrCodePlaceholderText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  qrCodeErrorContainer: {
    width: 200,
    height: 200,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: colors.error.main,
    borderStyle: 'dashed',
  },
  qrCodeErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error.main,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  qrCodeErrorSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
