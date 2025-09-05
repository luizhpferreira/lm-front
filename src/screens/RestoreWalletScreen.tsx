import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing } from '../theme';
import { bitcoinService } from '../services/bitcoinService';

interface RestoreWalletScreenProps {
  navigation: any;
}

export const RestoreWalletScreen: React.FC<RestoreWalletScreenProps> = ({ navigation }) => {
  const [mnemonic, setMnemonic] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [showWallet, setShowWallet] = useState(false);

  const handleRestoreWallet = async () => {
    if (!mnemonic.trim()) {
      Alert.alert('Erro', 'Por favor, digite seu mnemônico.');
      return;
    }

    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      Alert.alert('Erro', 'O mnemônico deve ter 12 ou 24 palavras.');
      return;
    }

    try {
      setIsRestoring(true);
      const restoredWallet = await bitcoinService.restoreWallet(mnemonic.trim());
      setWallet(restoredWallet);
      setShowWallet(true);
    } catch (error) {
      console.error('Erro ao restaurar carteira:', error);
      Alert.alert('Erro', 'Falha ao restaurar carteira. Verifique se o mnemônico está correto.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmRestore = () => {
    Alert.alert(
      'Carteira Restaurada!',
      'Sua carteira Bitcoin foi restaurada com sucesso.',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('WalletHome', { wallet }),
        },
      ]
    );
  };

  const handleClearMnemonic = () => {
    setMnemonic('');
  };

  if (isRestoring) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Restaurando sua carteira...</Text>
          <Text style={styles.loadingSubtext}>Isso pode levar alguns segundos</Text>
        </View>
      </View>
    );
  }

  if (showWallet && wallet) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Carteira Restaurada</Text>
            <Text style={styles.subtitle}>Sua carteira foi restaurada com sucesso</Text>
          </View>

          <View style={styles.walletInfoContainer}>
            <Text style={styles.walletInfoTitle}>Informações da Carteira</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={styles.infoValue}>Bitcoin Não-Custodial</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Rede:</Text>
              <Text style={styles.infoValue}>Mainnet</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Padrão:</Text>
              <Text style={styles.infoValue}>BIP39/BIP44</Text>
            </View>
          </View>

          <View style={styles.addressesContainer}>
            <Text style={styles.addressesTitle}>Seus Endereços Bitcoin</Text>
            <View style={styles.addressItem}>
              <Text style={styles.addressLabel}>Legacy (Recomendado):</Text>
              <Text style={styles.addressText}>{wallet.addresses.p2pkh}</Text>
            </View>
            <View style={styles.addressItem}>
              <Text style={styles.addressLabel}>Bech32:</Text>
              <Text style={styles.addressText}>{wallet.addresses.p2wpkh}</Text>
            </View>
            <View style={styles.addressItem}>
              <Text style={styles.addressLabel}>SegWit:</Text>
              <Text style={styles.addressText}>{wallet.addresses.p2sh}</Text>
            </View>
          </View>

          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>✅ Restauração Bem-sucedida</Text>
            <Text style={styles.successText}>
              Sua carteira foi restaurada com sucesso. Agora você pode enviar e receber bitcoins.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleConfirmRestore}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Restaurar Carteira</Text>
          <Text style={styles.subtitle}>Digite seu mnemônico para restaurar sua carteira</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Como restaurar sua carteira:</Text>
          <Text style={styles.infoText}>
            • Digite as 12 ou 24 palavras do seu mnemônico{'\n'}
            • Separe as palavras com espaços{'\n'}
            • Certifique-se de que estão na ordem correta{'\n'}
            • Verifique se não há erros de digitação
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Mnemônico</Text>
          <TextInput
            style={styles.textInput}
            value={mnemonic}
            onChangeText={setMnemonic}
            placeholder="Digite seu mnemônico aqui..."
            placeholderTextColor={colors.text.secondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />
          <View style={styles.inputFooter}>
            <Text style={styles.wordCount}>
              {mnemonic.trim() ? mnemonic.trim().split(/\s+/).length : 0} palavras
            </Text>
            {mnemonic.length > 0 && (
              <TouchableOpacity onPress={handleClearMnemonic} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.warningContainer}>
          <Text style={styles.warningTitle}>⚠️ Importante</Text>
          <Text style={styles.warningText}>
            • Nunca digite seu mnemônico em sites não confiáveis{'\n'}
            • Certifique-se de que está em um ambiente seguro{'\n'}
            • Verifique se não há câmeras ou pessoas observando{'\n'}
            • Suas chaves privadas nunca saem do seu dispositivo
          </Text>
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>Precisa de ajuda?</Text>
          <Text style={styles.helpText}>
            Se você não tem certeza sobre seu mnemônico, verifique:
            {'\n'}• Seu backup físico (papel, metal, etc.)
            {'\n'}• Outros dispositivos onde a carteira foi criada
            {'\n'}• Gerenciadores de senhas seguros
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            (!mnemonic.trim() || mnemonic.trim().split(/\s+/).length < 12) && styles.disabledButton,
          ]}
          onPress={handleRestoreWallet}
          activeOpacity={0.8}
          disabled={!mnemonic.trim() || mnemonic.trim().split(/\s+/).length < 12}
        >
          <Text style={styles.primaryButtonText}>Restaurar Carteira</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  inputContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 120,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  wordCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  helpContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  walletInfoContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  walletInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  addressesContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  addressesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  addressItem: {
    marginBottom: spacing.md,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  addressText: {
    fontSize: 12,
    color: colors.text.primary,
    fontFamily: 'monospace',
    backgroundColor: colors.background.primary,
    padding: spacing.sm,
    borderRadius: 6,
  },
  successContainer: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary.main,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  disabledButton: {
    backgroundColor: colors.border.light,
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
