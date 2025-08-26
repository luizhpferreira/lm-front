import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { colors, spacing, typography } from '../theme';

interface QRCodeScannerScreenProps {
  navigation: any;
}

export const QRCodeScannerScreen: React.FC<QRCodeScannerScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayInvoice = async () => {
    if (!paymentRequest) {
      Alert.alert('Erro', 'Payment request inválido');
      return;
    }

    // Verificar se é um payment request válido (começa com "lnbc")
    if (!paymentRequest.startsWith('lnbc')) {
      Alert.alert(
        'Payment Request Inválido',
        'Este payment request não parece ser válido. Certifique-se de que está copiando um payment request Lightning válido.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.payInvoice(paymentRequest);
      
      if (response.success) {
        Alert.alert(
          'Pagamento Realizado!',
          'O pagamento foi processado com sucesso.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowPaymentModal(false);
                setPaymentRequest('');
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Erro no Pagamento', response.message || 'Falha ao processar o pagamento');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = () => {
    setShowPaymentModal(true);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>💳 Pagar Invoice</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 Como usar:</Text>
          <Text style={styles.infoText}>
            1. Copie o payment request Lightning (começa com "lnbc"){'\n'}
            2. Cole no campo abaixo{'\n'}
            3. Confirme o pagamento
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleManualInput}>
          <Text style={styles.primaryButtonText}>📝 Inserir Payment Request</Text>
        </TouchableOpacity>

        <View style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>💡 Exemplo de Payment Request:</Text>
          <Text style={styles.exampleText}>
            lnbc1u1p3n9v8dpp5...{'\n'}
            (código longo que começa com "lnbc")
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>← Voltar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal para inserir payment request */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Pagar Invoice</Text>
            
            <Text style={styles.modalLabel}>Payment Request:</Text>
            <TextInput
              style={styles.textInput}
              value={paymentRequest}
              onChangeText={setPaymentRequest}
              placeholder="Cole aqui o payment request (lnbc...)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPaymentModal(false);
                  setPaymentRequest('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, loading && styles.disabledButton]}
                onPress={handlePayInvoice}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Pagar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.large,
    flex: 1,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.large,
    color: colors.primary,
  },
  infoCard: {
    backgroundColor: colors.card,
    padding: spacing.medium,
    borderRadius: spacing.small,
    marginBottom: spacing.large,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.small,
  },
  infoText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: spacing.medium,
    borderRadius: spacing.small,
    alignItems: 'center',
    marginBottom: spacing.large,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.white,
  },
  exampleCard: {
    backgroundColor: colors.card,
    padding: spacing.medium,
    borderRadius: spacing.small,
    marginBottom: spacing.large,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  exampleTitle: {
    ...typography.h3,
    color: colors.secondary,
    marginBottom: spacing.small,
  },
  exampleText: {
    ...typography.body,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    padding: spacing.medium,
    borderRadius: spacing.small,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: spacing.medium,
    padding: spacing.large,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.large,
    color: colors.primary,
  },
  modalLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.small,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.small,
    padding: spacing.medium,
    backgroundColor: colors.surface,
    color: colors.text,
    ...typography.body,
    textAlignVertical: 'top',
    marginBottom: spacing.large,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.medium,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.medium,
    borderRadius: spacing.small,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.medium,
    borderRadius: spacing.small,
    alignItems: 'center',
  },
  confirmButtonText: {
    ...typography.button,
    color: colors.white,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
