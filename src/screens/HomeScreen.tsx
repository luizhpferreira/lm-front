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

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [walletInfo, setWalletInfo] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceMemo, setInvoiceMemo] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    loadWalletInfo();
  }, []);

  const loadWalletInfo = async () => {
    setLoading(true);
    try {
      const response = await apiService.getWalletInfo();
      if (response.success && response.data) {
        setWalletInfo(response.data);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletInfo();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Erro no logout:', error);
              Alert.alert('Erro', 'Erro ao fazer logout');
            }
          },
        },
      ]
    );
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BFF Luma</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Informações do Usuário */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações da Conta</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CPF:</Text>
            <Text style={styles.infoValue}>{user?.username || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CPF:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Wallet ID:</Text>
            <Text style={styles.infoValue}>{user?.wallet_id}</Text>
          </View>
        </View>

        {/* Informações da Carteira */}
        {walletInfo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informações da Carteira</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue}>{walletInfo.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Criada em:</Text>
              <Text style={styles.infoValue}>{formatDate(walletInfo.created_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Atualizada em:</Text>
              <Text style={styles.infoValue}>{formatDate(walletInfo.updated_at)}</Text>
            </View>
          </View>
        )}

        {/* Ações */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ações</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowCreateInvoice(true)}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Criar Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PaymentStatus')}
          >
            <Text style={styles.actionButtonText}>Verificar Pagamento</Text>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 2,
    textAlign: 'right',
  },
  actionButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#e1e8ed',
  },
  confirmButton: {
    backgroundColor: '#3498db',
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
