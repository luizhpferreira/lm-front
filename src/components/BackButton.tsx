import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

interface BackButtonProps {
  onPress: () => void;
  style?: any;
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress, style }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <TouchableOpacity
      style={[
        styles.backButton, 
        { 
          top: Math.max(insets.top + 20, 60), // Aumentado para 60px mínimo - mais baixo
          left: Math.max(16, insets.left + 8),
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.backButtonText}>←</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    padding: 12, // Área de clique confortável
    zIndex: 10,
    // Removido: backgroundColor, borderRadius, shadow, border para ficar minimalista
    minWidth: 44, // Área de clique confortável
    minHeight: 44, // Área de clique confortável
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24, // Texto maior para melhor visibilidade
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
});
