import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { colors, spacing } from '../theme';
import { bitcoinService } from '../services/bitcoinService';
import { bitcoinApiService } from '../services/bitcoinApiService';
// import { BackupButton } from '../components/BackupButton';

interface BitcoinScreenProps {
  navigation: any;
}

export const BitcoinScreen: React.FC<BitcoinScreenProps> = ({ navigation }) => {
  const [hasWallet, setHasWallet] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const walletExists = await bitcoinService.instance.hasWallet();
      setHasWallet(walletExists);
    } catch (error) {
      console.error('Erro ao verificar carteira:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateWallet = () => {
    navigation.navigate('CreateWallet');
  };

  const handleRestoreWallet = () => {
    navigation.navigate('RestoreWallet');
  };

  const handleOpenWallet = async () => {
    try {
      const wallet = await bitcoinService.instance.loadWallet();
      if (wallet) {
        navigation.navigate('WalletHome', { wallet });
      } else {
        Alert.alert('Erro', 'Falha ao carregar carteira.');
      }
    } catch (error) {
      console.error('Erro ao abrir carteira:', error);
      Alert.alert('Erro', 'Falha ao abrir carteira.');
    }
  };

  const handleLightningPress = () => {
    navigation.navigate('Login');
  };


  const handleDeleteWallet = () => {
    Alert.alert(
      'Deletar Carteira',
      'Tem certeza que deseja deletar sua carteira atual? Esta ação não pode ser desfeita.\n\nCertifique-se de ter anotado seu mnemônico antes de continuar.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await bitcoinService.instance.deleteWallet();
              setHasWallet(false);
              Alert.alert('Sucesso', 'Carteira deletada com sucesso!');
            } catch (error) {
              console.error('Erro ao deletar carteira:', error);
              Alert.alert('Erro', 'Falha ao deletar carteira');
            }
          },
        },
      ]
    );
  };







  if (isChecking) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Verificando carteira...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.bitcoinSection}>
          <Text style={styles.bitcoinTitle}>Bitcoin</Text>
          <Text style={styles.bitcoinSubtitle}>Modo Soberano</Text>
          
          {/* Botão de Backup Temporário */}
          {/* <BackupButton /> */}
          
          {hasWallet ? (
            <View style={styles.walletExistsCard}>
              <Text style={styles.walletExistsTitle}>Carteira Encontrada</Text>
              <Text style={styles.walletExistsText}>
                Você já tem uma carteira Bitcoin não-custodial configurada.
              </Text>
            </View>
          ) : (
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Bem-vindo ao Bitcoin</Text>
              <Text style={styles.welcomeText}>
                Crie sua carteira não-custodial e tenha controle total sobre seus bitcoins.
              </Text>
            </View>
          )}
        </View>

        {/* Opções de carteira */}
        <View style={styles.walletOptions}>
          {hasWallet ? (
            <>
              <TouchableOpacity
                style={styles.primaryOption}
                onPress={handleOpenWallet}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryOptionText}>Abrir Carteira</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryOption, { marginTop: 10, backgroundColor: '#e74c3c' }]}
                onPress={handleDeleteWallet}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryOptionText, { color: 'white' }]}>🗑️ Deletar Carteira</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryOption}
                onPress={handleCreateWallet}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryOptionText}>Criar Nova Carteira</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryOption}
                onPress={handleRestoreWallet}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryOptionText}>Restaurar Carteira</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </View>

      {/* Botões na parte inferior */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={hasWallet ? handleOpenWallet : handleCreateWallet}
          activeOpacity={0.8}
        >
          <Text style={styles.bottomButtonText}>₿ Bitcoin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={handleLightningPress}
          activeOpacity={0.8}
        >
          <Text style={styles.bottomButtonText}>⚡ Lightning</Text>
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
    paddingHorizontal: Math.max(16, spacing.screenPadding * 0.8),
    paddingVertical: Math.max(20, spacing.screenPadding * 0.8),
    justifyContent: 'center',
  },
  bitcoinSection: {
    alignItems: 'center',
  },

  bitcoinTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  bitcoinSubtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
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
  walletExistsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  walletExistsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.sm,
  },
  walletExistsText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  welcomeCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  walletOptions: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  primaryOption: {
    backgroundColor: colors.primary.main,
    borderRadius: 25,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
  secondaryOption: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 25,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  secondaryOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  bottomButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: spacing.sm,
  },

  bottomButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
