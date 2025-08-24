import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';
import { getAdaptiveLayout, getAdaptiveBorderRadius } from '../utils/responsive';

interface ResponsiveCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  style,
  padding,
  margin,
}) => {
  const layout = getAdaptiveLayout();
  const borderRadius = getAdaptiveBorderRadius();

  return (
    <View
      style={[
        styles.card,
        {
          maxWidth: layout.maxCardWidth,
          alignSelf: layout.centerContent ? 'center' : 'stretch',
          padding: padding || 24,
          margin: margin || 16,
          borderRadius: borderRadius.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    shadowColor: colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});
