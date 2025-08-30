import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { colors, spacing, typography } from '../theme';

interface CreateInvoiceScreenProps {
  navigation: any;
}

export const CreateInvoiceScreen: React.FC<CreateInvoiceScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

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
      const response = await apiService.createInvoice({
        amount: amountNumber, // Usar sats diretamente
        memo: memo.trim() || 'Invoice criado via app',
      });

      if (response.success && response.data) {
        setCreatedInvoice(response.data);
        Alert.alert(
          'Invoice Criado!',
          `Invoice criado com sucesso!\n\nValor: ${amount} sats\nMemo: ${response.data.memo}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setAmount('');
                setMemo('');
              },
            },
          ]
        );
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
        await Clipboard.setString(createdInvoice.payment_request);
        Alert.alert('Sucesso', 'Payment Request copiado para a área de transferência!');
      } catch (error) {
        Alert.alert('Erro', 'Erro ao copiar para a área de transferência');
      }
    }
  };

  const handleClearInvoice = () => {
    setCreatedInvoice(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Invoice</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Novo Invoice</Text>
          
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
            <Text style={styles.inputLabel}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={memo}
              onChangeText={setMemo}
              placeholder="Descrição do pagamento"
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
              <Text style={styles.createButtonText}>💰 Criar Invoice</Text>
            )}
          </TouchableOpacity>
        </View>

        {createdInvoice && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✅ Invoice Criado</Text>
            
            <View style={styles.invoiceInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Valor:</Text>
                <Text style={styles.infoValue}>{createdInvoice.amount} sats</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Memo:</Text>
                <Text style={styles.infoValue}>{createdInvoice.memo}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hash:</Text>
                <Text style={styles.infoValue}>{createdInvoice.payment_hash}</Text>
              </View>
            </View>

            <View style={styles.paymentRequestContainer}>
              <Text style={styles.paymentRequestLabel}>Payment Request (BOLT11):</Text>
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
                <Text style={styles.copyButtonText}>📋 Copiar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearInvoice}
                activeOpacity={0.8}
              >
                <Text style={styles.clearButtonText}>🗑️ Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  backButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.background.tertiary,
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
    borderRadius: spacing.borderRadius.md,
    padding: spacing.buttonPadding,
    alignItems: 'center',
    marginTop: spacing.md,
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
  },
  copyButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.buttonPadding,
    alignItems: 'center',
  },
  copyButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.error.main,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.buttonPadding,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
});
