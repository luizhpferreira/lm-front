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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verificar Pagamento</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verificar Status do Pagamento</Text>
          <Text style={styles.description}>
            Digite o payment hash para verificar o status do pagamento
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Payment Hash</Text>
            <TextInput
              style={styles.input}
              value={paymentHash}
              onChangeText={setPaymentHash}
              placeholder="Digite o payment hash"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCheckPayment}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verificando...' : 'Verificar Status'}
            </Text>
          </TouchableOpacity>
        </View>

        {paymentStatus && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resultado da Verificação</Text>
            
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={[
                styles.statusValue,
                { color: paymentStatus.success ? '#27ae60' : '#e74c3c' }
              ]}>
                {paymentStatus.success ? 'Sucesso' : 'Erro'}
              </Text>
            </View>

            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Mensagem:</Text>
              <Text style={styles.statusValue}>{paymentStatus.message}</Text>
            </View>

            {paymentStatus.data && (
              <View style={styles.dataContainer}>
                <Text style={styles.dataTitle}>Dados do Pagamento:</Text>
                <Text style={styles.dataText}>
                  {JSON.stringify(paymentStatus.data, null, 2)}
                </Text>
              </View>
            )}

            {paymentStatus.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Erro:</Text>
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
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
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: 'white',
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
