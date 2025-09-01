import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const { width, height } = Dimensions.get('window');
const SCREEN_WIDTH = width;
const SCREEN_HEIGHT = height;

interface QRCodeScannerScreenProps {
  navigation: any;
}

export const QRCodeScannerScreen: React.FC<QRCodeScannerScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    // Verifica se é um payment request Lightning válido
    if (data.startsWith('lnbc')) {
      setPaymentRequest(data);
      setShowManualModal(true);
    } else {
      Alert.alert(
        'QR Code Inválido',
        'Este QR code não é um payment request Lightning válido.\n\nFormato esperado: lnbc1...',
        [
          { text: 'OK', onPress: () => setScanned(false) },
          { text: 'Inserir Manualmente', onPress: () => setShowManualModal(true) }
        ]
      );
    }
  };

  const handlePayInvoice = async () => {
    if (!paymentRequest.trim()) {
      Alert.alert('Erro', 'Por favor, insira um payment request válido.');
      return;
    }

    // Valida se é um payment request Lightning válido
    if (!paymentRequest.startsWith('lnbc')) {
      Alert.alert('Erro', 'Payment request inválido. Deve começar com "lnbc".');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.payInvoice(paymentRequest.trim());
      
      if (response.success && response.data) {
        Alert.alert(
          'Sucesso!',
          `Pagamento realizado com sucesso!\n\nHash: ${response.data.payment_hash}\nValor: ${response.data.amount} sats\nMemo: ${response.data.memo || 'N/A'}\nStatus: ${response.data.paid ? 'Pago' : 'Processando'}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setPaymentRequest('');
                setShowManualModal(false);
                setScanned(false);
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
      
      // Verifica se é erro de saldo insuficiente
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erro ao processar pagamento. Tente novamente.';
      
      if (errorMessage.includes('saldo insuficiente') || errorMessage.includes('Insufficient balance')) {
        Alert.alert(
          'Saldo Insuficiente',
          'Sua carteira não possui saldo suficiente para realizar este pagamento.\n\nPara adicionar saldo, entre em contato com o suporte ou aguarde receber um pagamento.',
          [
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = () => {
    setShowManualModal(true);
  };

  const handleCancel = () => {
    setPaymentRequest('');
    setShowManualModal(false);
    setScanned(false);
    navigation.goBack();
  };

  const resetScanner = () => {
    setScanned(false);
    setPaymentRequest('');
  };



  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scanner QR Code</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Carregando permissões...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scanner QR Code</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>❌ Acesso à câmera negado</Text>
          <Text style={styles.errorDescription}>
            Para usar o scanner de QR code, você precisa permitir o acesso à câmera.
          </Text>
          <TouchableOpacity style={styles.manualButton} onPress={requestPermission}>
            <Text style={styles.manualButtonText}>Conceder permissão</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualButton} onPress={handleManualInput}>
            <Text style={styles.manualButtonText}>📝 Inserir Payment Request Manualmente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButtonStyle} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonTextStyle}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📱 Scanner QR Code</Text>
        <TouchableOpacity style={styles.manualButton} onPress={handleManualInput}>
          <Text style={styles.manualButtonText}>📝</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.scanText}>
            Posicione o QR code dentro do frame
          </Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <Text style={styles.instructionText}>
          Escaneie um QR code de invoice Lightning para pagar automaticamente
        </Text>
        
        <View style={styles.controlButtons}>
          {scanned && (
            <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
              <Text style={styles.scanAgainButtonText}>🔄 Escanear Novamente</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal para inserção manual ou confirmação */}
      <Modal
        visible={showManualModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {scanned ? '💳 Confirmar Pagamento' : '📝 Inserir Payment Request'}
            </Text>
            
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
                  <Text style={styles.confirmButtonText}>
                    {scanned ? 'Pagar' : 'Pagar'}
                  </Text>
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
  manualButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.primary.main,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenPadding,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error.main,
    marginBottom: spacing.md,
  },
  errorDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  backButtonStyle: {
    padding: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  backButtonTextStyle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary.main,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    top: 'auto',
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  cornerBottomRight: {
    top: 'auto',
    bottom: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  scanText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.xl,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  controlsContainer: {
    padding: spacing.screenPadding,
    backgroundColor: colors.background.secondary,
  },
  instructionText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  cameraToggleButton: {
    backgroundColor: colors.secondary.main,
    padding: spacing.buttonPadding,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    flex: 1,
  },
  cameraToggleButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  scanAgainButton: {
    backgroundColor: colors.info.main,
    padding: spacing.buttonPadding,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    flex: 1,
  },
  scanAgainButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
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
