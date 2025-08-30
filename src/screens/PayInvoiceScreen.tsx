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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface PayInvoiceScreenProps {
  navigation: any;
}

export const PayInvoiceScreen: React.FC<PayInvoiceScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [paymentRequest, setPaymentRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(true);

  const handlePayInvoice = async () => {
    if (!paymentRequest.trim()) {
      Alert.alert('Erro', 'Por favor, insira um payment request válido.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.payInvoice(paymentRequest.trim());
      
      if (response.success) {
        Alert.alert(
          'Sucesso!',
          `Pagamento realizado com sucesso!\n\nHash: ${response.data.payment_hash}\nValor: ${response.data.amount} sats\nMemo: ${response.data.memo || 'N/A'}\nStatus: ${response.data.paid ? 'Pago' : 'Processando'}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setPaymentRequest('');
                setShowPaymentModal(false);
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Erro', response.message || 'Erro ao processar pagamento.');
      }
    } catch (error: any) {
      console.error('Erro ao pagar invoice:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao processar pagamento. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPaymentRequest('');
    setShowPaymentModal(false);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>💳</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Pagar Invoice</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações do Pagamento</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Usuário:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>Pronto para pagar</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instruções</Text>
          <Text style={styles.instructionText}>
            Cole o payment request (BOLT11) no campo abaixo para realizar o pagamento.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Pagar Invoice</Text>
            
            <Text style={styles.modalLabel}>Payment Request (BOLT11):</Text>
            <TextInput
              style={styles.textInput}
              value={paymentRequest}
              onChangeText={setPaymentRequest}
              placeholder="lnbc1qxy2kgxgj9xzd..."
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={4}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, loading && styles.disabledButton]}
                onPress={handlePayInvoice}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <Text style={styles.confirmButtonText}>Pagar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: spacing.sm,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gradients.primary[0],
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
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
  instructionText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.cardPadding,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.text.primary,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.md,
    backgroundColor: colors.background.primary,
    color: colors.text.primary,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    padding: spacing.buttonPadding,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    padding: spacing.buttonPadding,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
