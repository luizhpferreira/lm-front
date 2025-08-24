import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService, WalletData } from '../services/api';
import { colors, spacing, typography } from '../theme';

interface PreferencesScreenProps {
  navigation: any;
}

export const PreferencesScreen: React.FC<PreferencesScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [walletInfo, setWalletInfo] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);

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
      console.error('Erro ao carregar informações da carteira:', error);
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

  const handleLogout = async () => {
    Alert.alert(
      'Encerrar Sessão',
      'Tem certeza que deseja encerrar sua sessão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Erro no logout:', error);
              Alert.alert('Erro', 'Erro ao encerrar sessão');
            }
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Preferências</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Informações da Conta */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações da Conta</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CPF:</Text>
            <Text style={styles.infoValue}>{user?.username || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Wallet ID:</Text>
            <Text style={styles.infoValue}>{user?.wallet_id}</Text>
          </View>
        </View>

        {/* Informações da Carteira */}
        {walletInfo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informações da Carteira</Text>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue}>{walletInfo.id}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Criada em:</Text>
              <Text style={styles.infoValue}>{formatDate(walletInfo.created_at)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Atualizada em:</Text>
              <Text style={styles.infoValue}>{formatDate(walletInfo.updated_at)}</Text>
            </View>
          </View>
        )}

        {/* Sobre */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sobre</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Versão do App</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Desenvolvido por</Text>
            <Text style={styles.infoValue}>BFF Luma</Text>
          </View>
        </View>

        {/* Encerrar Sessão - Última opção */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.logoutItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutContent}>
              <View style={styles.logoutIcon}>
                <Text style={styles.logoutIconText}>🚪</Text>
              </View>
              <View style={styles.logoutText}>
                <Text style={styles.logoutTitle}>Encerrar Sessão</Text>
                <Text style={styles.logoutDescription}>
                  Sair da sua conta atual
                </Text>
              </View>
            </View>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: spacing.screenPadding,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    backgroundColor: colors.error.light,
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
  logoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  logoutIconText: {
    fontSize: 18,
  },
  logoutText: {
    flex: 1,
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error.main,
    marginBottom: 2,
  },
  logoutDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
