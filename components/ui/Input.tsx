import { type ReactNode, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ViewStyle,
} from 'react-native';
import { Eye, EyeOff, X } from 'lucide-react-native';
import { Colors, FontFamily, Radius, Spacing, Typography } from '@/constants/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  helper?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  leftIcon?: ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  leftIcon,
  disabled = false,
  style,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const borderColor = error
    ? Colors.error
    : isFocused
      ? Colors.primary
      : Colors.outline;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          { borderColor },
          isFocused && styles.inputFocused,
          disabled && styles.inputDisabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.input}
        />

        {secureTextEntry && (
          <Pressable
            style={styles.rightIcon}
            onPress={() => setIsSecure(!isSecure)}
            hitSlop={8}
          >
            {isSecure ? (
              <Eye size={20} color={Colors.textSecondary} strokeWidth={2} />
            ) : (
              <EyeOff size={20} color={Colors.textSecondary} strokeWidth={2} />
            )}
          </Pressable>
        )}

        {!secureTextEntry && value.length > 0 && isFocused && (
          <Pressable
            style={styles.rightIcon}
            onPress={() => onChangeText('')}
            hitSlop={8}
          >
            <X size={18} color={Colors.textSecondary} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helperText}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.labelMedium,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.input,
    backgroundColor: Colors.surface,
    minHeight: 52,
    paddingHorizontal: Spacing.base,
  },
  inputFocused: {
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: Colors.surfaceVariant,
    opacity: 0.6,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  helperText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
