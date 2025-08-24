import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: string;
  info?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  info,
  style,
  ...props
}) => {
  const inputStyle = [
    styles.input,
    error && styles.inputError,
    success && styles.inputSuccess,
    style,
  ];

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={inputStyle}
        placeholderTextColor={colors.text.tertiary}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>{success}</Text>}
      {info && <Text style={styles.infoText}>{info}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.inputPadding,
    fontSize: 16,
    backgroundColor: colors.background.tertiary,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error.main,
  },
  inputSuccess: {
    borderColor: colors.success.main,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  successText: {
    color: colors.success.main,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  infoText: {
    color: colors.info.main,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
