import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing } from '../theme';
import { bitcoinService } from '../services/bitcoinService';

interface CreateWalletScreenProps {
  navigation: any;
}

export const CreateWalletScreen: React.FC<CreateWalletScreenProps> = ({ navigation }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);

  const handleGenerateWallet = async () => {
    try {
      setIsGenerating(true);
      const newWallet = await bitcoinService.generateWallet();
      setWallet(newWallet);
      setShowMnemonic(true);
    } catch (error) {
      console.error('Erro ao gerar carteira:', error);
      Alert.alert('Erro', 'Falha ao gerar carteira. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmMnemonic = () => {
    Alert.alert(
      'Carteira Criada!',
      'Sua carteira Bitcoin foi criada com sucesso. Guarde seu mnemônico em local seguro.',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('WalletHome', { wallet }),
        },
      ]
    );
  };

  const handleBackupLater = () => {
    Alert.alert(
      'Atenção!',
      'É altamente recomendado fazer backup do seu mnemônico agora. Você pode fazer isso depois nas configurações.',
      [
        {
          text: 'Fazer Backup Agora',
          onPress: handleConfirmMnemonic,
        },
        {
          text: 'Depois',
          onPress: () => navigation.navigate('WalletHome', { wallet }),
          style: 'cancel',
        },
      ]
    );
  };

  if (isGenerating) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Gerando sua carteira...</Text>
          <Text style={styles.loadingSubtext}>Isso pode levar alguns segundos</Text>
        </View>
      </View>
    );
  }

  if (showMnemonic && wallet) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Sua Carteira Bitcoin</Text>
            <Text style={styles.subtitle}>Guarde estas palavras em local seguro</Text>
          </View>

          <View style={styles.mnemonicContainer}>
            <Text style={styles.mnemonicTitle}>Mnemônico (24 palavras)</Text>
            <View style={styles.mnemonicGrid}>
              {wallet.mnemonic.split(' ').map((word: string, index: number) => (
                <View key={index} style={styles.mnemonicWord}>
                  <Text style={styles.mnemonicNumber}>{index + 1}</Text>
                  <Text style={styles.mnemonicText}>{word}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.warningContainer}>
            <Text style={styles.warningTitle}>⚠️ Importante</Text>
            <Text style={styles.warningText}>
              • Anote estas palavras em ordem{'\n'}
              • Guarde em local seguro e offline{'\n'}
              • Nunca compartilhe com ninguém{'\n'}
              • Sem estas palavras, você perderá acesso aos seus bitcoins
            </Text>
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
          </View>
        </ScrollView>

        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleBackupLater}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Continuar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleConfirmMnemonic}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Entendi, Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Criar Carteira Bitcoin</Text>
          <Text style={styles.subtitle}>Modo Soberano - Você controla suas chaves</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>O que é uma carteira não-custodial?</Text>
          <Text style={styles.infoText}>
            • Você é o único dono das suas chaves privadas{'\n'}
            • Ninguém pode acessar seus bitcoins{'\n'}
            • Você é responsável pela segurança{'\n'}
            • Funciona offline, sem internet
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Recursos da sua carteira:</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>✓ Geração de mnemônico BIP39</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>✓ Múltiplos tipos de endereços</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>✓ Armazenamento local seguro</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>✓ Backup e restauração</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleGenerateWallet}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Criar Carteira</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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
    marginBottom: spacing.xl,
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
  featuresContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  featureItem: {
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  mnemonicContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  mnemonicTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  mnemonicWord: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  mnemonicNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.main,
    marginRight: spacing.sm,
    minWidth: 20,
  },
  mnemonicText: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: spacing.lg,
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
  addressesContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
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
