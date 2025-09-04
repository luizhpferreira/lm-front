import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, spacing } from '../theme';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const logoScale = new Animated.Value(0);
  const logoOpacity = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);

  useEffect(() => {
    // Animação de entrada da logo
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false, // Transform não suporta useNativeDriver
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Aguarda um pouco
      Animated.delay(300),
      // Fade in do texto
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Aguarda mais um pouco
      Animated.delay(500),
      // Aguarda o tempo restante para completar 6 segundos
      Animated.delay(3500),
    ]).start(() => {
      // Chama onFinish após a animação completa
      onFinish();
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>⚡</Text>
        </View>
      </Animated.View>

      <Animated.Text
        style={[
          styles.companyName,
          {
            opacity: textOpacity,
          },
        ]}
      >
        Luma
      </Animated.Text>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: textOpacity,
          },
        ]}
      >
        Sua carteira digital
      </Animated.Text>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoText: {
    fontSize: 60,
    color: colors.text.inverse,
  },
  companyName: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
