import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { colors, spacing } from '../theme';

interface BitcoinScreenProps {
  navigation: any;
}

export const BitcoinScreen: React.FC<BitcoinScreenProps> = ({ navigation }) => {
  const handleBitcoinPress = () => {
    Alert.alert(
      'Modo Soberano',
      'Use sem conta - modo soberano. Em breve!',
      [{ text: 'OK' }]
    );
  };

  const handleLightningPress = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.bitcoinSection}>
          <Text style={styles.bitcoinTitle}>Bitcoin</Text>
          <Text style={styles.bitcoinSubtitle}>Ative o Modo Soberano</Text>
          
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Em Breve</Text>
          </View>
        </View>
      </View>

      {/* Botões na parte inferior */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={handleBitcoinPress}
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
  messageCard: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  messageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.md,
  },
  messageText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  messageSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
