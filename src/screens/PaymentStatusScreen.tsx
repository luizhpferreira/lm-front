import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { apiService } from '../services/api';
import { colors, spacing } from '../theme';

interface PaymentStatusScreenProps {
  navigation: any;
}

export const PaymentStatusScreen: React.FC<PaymentStatusScreenProps> = ({ navigation }) => {
  const [paymentHash, setPaymentHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);

  const handleCheckPayment = async () => {
    if (!paymentHash.trim()) {
      Alert.alert('Erro', 'Por favor, digite o payment hash');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.checkPaymentStatus(paymentHash.trim());
      setPaymentStatus(response);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
      setPaymentStatus(null);
    } finally {
      setLoading(false);
    }
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

        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Hash do Pagamento</Text>
            <TextInput
              style={styles.input}
              value={paymentHash}
              onChangeText={setPaymentHash}
              placeholder="Cole o hash aqui"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCheckPayment}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verificando...' : 'Verificar'}
            </Text>
          </TouchableOpacity>
        </View>

        {paymentStatus && (
          <View style={styles.card}>
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[
                styles.statusValue,
                { color: paymentStatus.success ? '#27ae60' : '#e74c3c' }
              ]}>
                {paymentStatus.success ? 'Sucesso' : 'Erro'}
              </Text>
            </View>

            {paymentStatus.data && (
              <View style={styles.dataContainer}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Status</Text>
                  <Text style={[
                    styles.dataValue,
                    { color: paymentStatus.data.paid ? '#27ae60' : '#f39c12' }
                  ]}>
                    {paymentStatus.data.paid ? 'Pago' : 'Pendente'}
                  </Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Valor</Text>
                  <Text style={styles.dataValue}>{paymentStatus.data.amount} sats</Text>
                </View>
                
                {paymentStatus.data.memo && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Memo</Text>
                    <Text style={styles.dataValue}>{paymentStatus.data.memo}</Text>
                  </View>
                )}
              </View>
            )}

            {paymentStatus.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{paymentStatus.error}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  button: {
    backgroundColor: colors.primary.main,
    borderRadius: 25, // Formato de cápsula
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  statusValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  dataContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  dataText: {
    fontSize: 12,
    color: '#2c3e50',
    fontFamily: 'monospace',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fdf2f2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
  },
});
