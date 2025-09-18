import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { colors, spacing } from '../theme';
import { bitcoinService } from '../services/bitcoinService';
import { ResponsiveContainer, ResponsiveCard } from '../components';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import * as Clipboard from 'expo-clipboard';

interface BackupWalletScreenProps {
  navigation: any;
}

export const BackupWalletScreen: React.FC<BackupWalletScreenProps> = ({ navigation }) => {
  const [wallet, setWallet] = useState<any>(null);
  const [mnemonic, setMnemonic] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const deviceInfo = useDeviceInfo();

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const loadedWallet = await bitcoinService.instance.loadWallet();
      if (loadedWallet) {
        setWallet(loadedWallet);
        setMnemonic(loadedWallet.mnemonic || '');
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

  const handleCopyMnemonic = async () => {
    try {
      await Clipboard.setStringAsync(mnemonic);
      Alert.alert('Copiado', 'Mnemônico copiado para a área de transferência');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao copiar mnemônico');
    }
  };

  const handleShowMnemonic = () => {
    Alert.alert(
      'Mostrar Mnemônico',
      'Certifique-se de que ninguém pode ver sua tela antes de continuar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Mostrar', onPress: () => setShowMnemonic(true) },
      ]
    );
  };

  // Estilos dinâmicos baseados no dispositivo
  const dynamicStyles = StyleSheet.create({
    header: {
      ...styles.header,
      paddingVertical: deviceInfo.isSmallScreen ? 12 : 16,
    },
    headerTitle: {
      ...styles.headerTitle,
      fontSize: deviceInfo.isSmallScreen ? 18 : 20,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando carteira...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Backup da Carteira</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ResponsiveContainer>
        <ScrollView style={styles.content}>
          {/* Aviso de Segurança */}
          <ResponsiveCard>
            <View style={styles.warningContainer}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>Importante</Text>
              <Text style={styles.warningText}>
                Anote seu mnemônico em um local seguro. Se você perder este mnemônico, 
                perderá acesso permanente aos seus bitcoins.
              </Text>
            </View>
          </ResponsiveCard>

          {/* Mnemônico */}
          <ResponsiveCard>
            <Text style={styles.cardTitle}>Mnemônico da Carteira</Text>
            
            {!showMnemonic ? (
              <TouchableOpacity
                style={styles.showButton}
                onPress={handleShowMnemonic}
                activeOpacity={0.7}
              >
                <Text style={styles.showButtonText}>Mostrar Mnemônico</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.mnemonicContainer}>
                <View style={styles.mnemonicWords}>
                  {mnemonic.split(' ').map((word, index) => (
                    <View key={index} style={styles.mnemonicWord}>
                      <Text style={styles.mnemonicWordNumber}>{index + 1}</Text>
                      <Text style={styles.mnemonicWordText}>{word}</Text>
                    </View>
                  ))}
                </View>
                
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyMnemonic}
                  activeOpacity={0.7}
                >
                  <Text style={styles.copyButtonText}>Copiar Mnemônico</Text>
                </TouchableOpacity>
              </View>
            )}
          </ResponsiveCard>

          {/* Informações da Carteira */}
          {wallet && (
            <ResponsiveCard>
              <Text style={styles.cardTitle}>Informações da Carteira</Text>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Endereço Bech32:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {wallet.addresses?.bech32 || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Endereço Legacy:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {wallet.addresses?.p2pkh || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Endereço P2SH:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {wallet.addresses?.p2sh || 'N/A'}
                </Text>
              </View>
            </ResponsiveCard>
          )}

          {/* Instruções */}
          <ResponsiveCard>
            <Text style={styles.cardTitle}>Como Fazer Backup</Text>
            
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>
                Anote as 12 palavras em ordem em um papel
              </Text>
            </View>
            
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                Guarde o papel em um local seguro
              </Text>
            </View>
            
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                Nunca compartilhe seu mnemônico com ninguém
              </Text>
            </View>
            
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>4</Text>
              <Text style={styles.instructionText}>
                Considere fazer múltiplas cópias em locais diferentes
              </Text>
            </View>
          </ResponsiveCard>
        </ScrollView>
      </ResponsiveContainer>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
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
    fontSize: 20,
    color: colors.text.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  warningContainer: {
    alignItems: 'center',
    padding: spacing.md,
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e67e22',
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  showButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 25,
    alignItems: 'center',
  },
  showButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  mnemonicContainer: {
    marginTop: spacing.md,
  },
  mnemonicWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  mnemonicWord: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  mnemonicWordNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginRight: spacing.sm,
    minWidth: 20,
  },
  mnemonicWordText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  copyButton: {
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 12,
    color: colors.text.primary,
    flex: 2,
    textAlign: 'right',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary.main,
    marginRight: spacing.md,
    minWidth: 24,
  },
  instructionText: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 20,
  },
});
