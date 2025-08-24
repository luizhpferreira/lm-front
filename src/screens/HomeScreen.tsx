import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService, WalletData, InvoiceData } from '../services/api';
import { colors, spacing, typography } from '../theme';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceMemo, setInvoiceMemo] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceData | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh functionality can be added here if needed
    setRefreshing(false);
  };



  const handleCreateInvoice = async () => {
    if (!invoiceAmount || !invoiceMemo) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    const amount = parseInt(invoiceAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Por favor, digite um valor válido');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.createInvoice({
        amount,
        memo: invoiceMemo,
      });

      if (response.success && response.data) {
        setCreatedInvoice(response.data);
        setShowCreateInvoice(false);
        setInvoiceAmount('');
        setInvoiceMemo('');
        Alert.alert('Sucesso', 'Invoice criado com sucesso!');
      }
    } catch (error: any) {
      Alert.alert('Erro ao criar invoice', error.message);
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>BFF Luma</Text>
        </View>
        <TouchableOpacity 
          style={styles.preferencesButton} 
          onPress={() => navigation.navigate('Preferences')}
        >
          <Text style={styles.preferencesText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >


        {/* Ações */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ações</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => setShowCreateInvoice(true)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Criar Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => navigation.navigate('PaymentStatus')}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Verificar Pagamento</Text>
          </TouchableOpacity>
        </View>

        {/* Invoice Criado */}
        {createdInvoice && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Último Invoice Criado</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Valor:</Text>
              <Text style={styles.infoValue}>{createdInvoice.amount} sats</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Memo:</Text>
              <Text style={styles.infoValue}>{createdInvoice.memo}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Hash:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {createdInvoice.payment_hash}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Request:</Text>
              <Text style={styles.infoValue} numberOfLines={3}>
                {createdInvoice.payment_request}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal para criar invoice */}
      <Modal
        visible={showCreateInvoice}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateInvoice(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Criar Invoice</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Valor (sats)</Text>
              <TextInput
                style={styles.input}
                value={invoiceAmount}
                onChangeText={setInvoiceAmount}
                placeholder="Digite o valor em satoshis"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Memo</Text>
              <TextInput
                style={styles.input}
                value={invoiceMemo}
                onChangeText={setInvoiceMemo}
                placeholder="Digite uma descrição"
                multiline
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateInvoice(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, loading && styles.buttonDisabled]}
                onPress={handleCreateInvoice}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Criando...' : 'Criar'}
                </Text>
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
  preferencesButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.background.tertiary,
  },
  preferencesText: {
    fontSize: 20,
    fontWeight: '600',
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
  actionButton: {
    borderRadius: spacing.borderRadius.md,
    padding: spacing.buttonPadding,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryAction: {
    backgroundColor: colors.primary.main,
  },
  secondaryAction: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  actionButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionText: {
    color: colors.primary.main,
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
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.inputPadding,
    fontSize: 16,
    backgroundColor: colors.background.tertiary,
    color: colors.text.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.buttonPadding,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.neutral[200],
  },
  confirmButton: {
    backgroundColor: colors.primary.main,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[400],
    opacity: 0.6,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
