import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { getAdaptiveLayout } from '../utils/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  padding,
}) => {
  const layout = getAdaptiveLayout();

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: padding || layout.horizontalPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
