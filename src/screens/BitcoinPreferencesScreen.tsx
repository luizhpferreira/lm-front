import React, { useState } from 'react';
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
import { multiWalletService } from '../services/multiWalletService';
import { ResponsiveContainer, ResponsiveCard } from '../components';
import { useDeviceInfo } from '../hooks/useDeviceInfo';

interface BitcoinPreferencesScreenProps {
  navigation: any;
}

export const BitcoinPreferencesScreen: React.FC<BitcoinPreferencesScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const deviceInfo = useDeviceInfo();

  const handleDeleteWallet = async () => {
    try {
      // Obter carteira ativa
      const activeWallet = await multiWalletService.getActiveWallet();
      if (!activeWallet) {
        Alert.alert('Erro', 'Nenhuma carteira ativa encontrada.');
        return;
      }

      Alert.alert(
        'Deletar Carteira',
        `Tem certeza que deseja deletar "${activeWallet.name}"? Esta ação não pode ser desfeita.\n\nCertifique-se de ter anotado seu mnemônico antes de continuar.`,
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
                setLoading(true);
                
                // Remover carteira do sistema de múltiplas carteiras
                await multiWalletService.removeWallet(activeWallet.id);
                
                // Se não há mais carteiras, limpar o serviço Bitcoin
                const remainingWallets = await multiWalletService.loadWallets();
                if (remainingWallets.length === 0) {
                  await bitcoinService.instance.deleteWallet();
                }
                
                Alert.alert('Sucesso', 'Carteira deletada com sucesso!', [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Bitcoin'),
                  },
                ]);
              } catch (error) {
                console.error('Erro ao deletar carteira:', error);
                Alert.alert('Erro', 'Falha ao deletar carteira');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao obter carteira ativa:', error);
      Alert.alert('Erro', 'Não foi possível acessar as informações da carteira.');
    }
  };

  const handleBackupWallet = () => {
    navigation.navigate('BackupWallet');
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Preferências Bitcoin</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ResponsiveContainer>
        <ScrollView style={styles.content}>
          {/* Informações da Carteira */}
          <ResponsiveCard>
            <Text style={styles.cardTitle}>Carteira Bitcoin</Text>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={styles.infoValue}>Não-custodial</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Rede:</Text>
              <Text style={styles.infoValue}>Bitcoin Mainnet</Text>
            </View>
          </ResponsiveCard>

          {/* Ações da Carteira */}
          <ResponsiveCard>
            <Text style={styles.cardTitle}>Ações</Text>
            
            <TouchableOpacity
              style={styles.preferenceItem}
              onPress={handleBackupWallet}
              activeOpacity={0.7}
            >
              <View style={styles.preferenceContent}>
                <View style={[styles.preferenceIcon, { backgroundColor: '#4dabf7' }]}>
                  <Text style={styles.iconText}>💾</Text>
                </View>
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceTitle}>Fazer Backup</Text>
                  <Text style={styles.preferenceDescription}>
                    Exportar mnemônico da carteira
                  </Text>
                </View>
              </View>
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          </ResponsiveCard>

          {/* Zona de Perigo */}
          <ResponsiveCard>
            <Text style={styles.cardTitle}>Zona de Perigo</Text>
            
            <TouchableOpacity
              style={styles.preferenceItem}
              onPress={handleDeleteWallet}
              activeOpacity={0.7}
              disabled={loading}
            >
              <View style={styles.preferenceContent}>
                <View style={[styles.preferenceIcon, { backgroundColor: '#e74c3c' }]}>
                  <Text style={styles.iconText}>🗑️</Text>
                </View>
                <View style={styles.preferenceText}>
                  <Text style={[styles.preferenceTitle, { color: '#e74c3c' }]}>
                    {loading ? 'Deletando...' : 'Deletar Carteira'}
                  </Text>
                  <Text style={styles.preferenceDescription}>
                    Remove permanentemente a carteira do dispositivo
                  </Text>
                </View>
              </View>
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 18,
  },
  preferenceText: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  arrowText: {
    fontSize: 20,
    color: colors.text.secondary,
    fontWeight: '300',
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
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.primary,
  },
});
