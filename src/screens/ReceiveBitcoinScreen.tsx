import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { bitcoinService } from '../services/bitcoinService';
import type { BitcoinWallet } from '../services/bitcoinService';
import { colors } from '../theme/colors';

interface ReceiveBitcoinScreenProps {
  navigation: any;
  route: any;
}

export const ReceiveBitcoinScreen: React.FC<ReceiveBitcoinScreenProps> = ({ navigation, route }) => {
  const [wallet, setWallet] = useState<BitcoinWallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const loadedWallet = await bitcoinService.instance.loadWallet();
      if (loadedWallet) {
        setWallet(loadedWallet);
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

  const getCurrentAddress = () => {
    if (!wallet) return '';
    // Sempre usar Bech32 (SegWit) como padrão
    return wallet.addresses.bech32;
  };

  const getAddressTypeLabel = (type: string) => {
    switch (type) {
      case 'p2pkh': return 'Legacy (1...)';
      case 'p2sh': return 'P2SH (3...)';
      case 'bech32': return 'SegWit (bc1...) ⭐';
      default: return type;
    }
  };

  const copyAddress = async () => {
    const address = getCurrentAddress();
    if (address) {
      await Clipboard.setString(address);
      Alert.alert('Sucesso', 'Endereço copiado para a área de transferência');
    }
  };

  const shareAddress = async () => {
    const address = getCurrentAddress();
    if (address) {
      try {
        await Share.share({
          message: `Meu endereço Bitcoin: ${address}`,
          title: 'Endereço Bitcoin',
        });
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    }
  };

  const generatePaymentRequest = () => {
    const address = getCurrentAddress();
    if (!address) return '';

    return `bitcoin:${address}`;
  };

  const copyPaymentRequest = async () => {
    const paymentRequest = generatePaymentRequest();
    if (paymentRequest) {
      await Clipboard.setString(paymentRequest);
      Alert.alert('Sucesso', 'Solicitação de pagamento copiada');
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
        <Text style={styles.headerTitle}>Receber Bitcoin</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* QR Code Placeholder */}
        <View style={styles.qrContainer}>
          <View style={styles.qrCode}>
            <Text style={styles.qrText}>QR Code</Text>
            <Text style={styles.qrSubtext}>Endereço: {getCurrentAddress().substring(0, 20)}...</Text>
          </View>
        </View>

        {/* Address Type Info */}
        <View style={styles.section}>
          <View style={styles.addressTypeInfo}>
            <Text style={styles.addressTypeLabel}>SegWit (bc1...)</Text>
            <Text style={styles.addressTypeDescription}>
              Endereço moderno com taxas menores e transações mais rápidas
            </Text>
          </View>
        </View>

        {/* Current Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço Atual</Text>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>{getCurrentAddress()}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={copyAddress}>
              <Ionicons name="copy-outline" size={20} color={colors.primary.main} />
            </TouchableOpacity>
          </View>
        </View>


        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={copyAddress}>
            <Ionicons name="copy-outline" size={24} color={colors.text.onPrimary} />
            <Text style={styles.actionButtonText}>Copiar Endereço</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={shareAddress}>
            <Ionicons name="share-outline" size={24} color={colors.text.onPrimary} />
            <Text style={styles.actionButtonText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            • Use endereços Bech32 (bc1...) para taxas mais baixas{'\n'}
            • Endereços Legacy (1...) têm maior compatibilidade{'\n'}
            • Sempre verifique o endereço antes de receber pagamentos
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
  qrContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  qrCode: {
    width: 200,
    height: 200,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  qrText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  qrSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
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
  addressTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  addressTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  addressTypeButtonSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  addressTypeText: {
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'center',
  },
  addressTypeTextSelected: {
    color: colors.text.onPrimary,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inputLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 16,
  },
  paymentRequestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  paymentRequestText: {
    flex: 1,
    fontSize: 12,
    color: colors.text.primary,
    fontFamily: 'monospace',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  infoContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  addressTypeInfo: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addressTypeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary.main,
    marginBottom: 8,
  },
  addressTypeDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
