import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Colors, FontFamily, Radius, Spacing, Typography } from '@/constants/theme';

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'error';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'filled',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const sizeStyle = styles[size];
  const variantStyle = styles[variant];
  const disabledStyle = isDisabled ? styles.disabled : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        variantStyle.container,
        disabledStyle,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'filled' || variant === 'error' ? Colors.textOnPrimary : Colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={[styles.label, variantStyle.label, sizeStyle.label]}>{label}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </Pressable>
  );
}

type VariantStyle = { container: ViewStyle; label: TextStyle };

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  } as ViewStyle,
  fullWidth: {
    width: '100%',
  } as ViewStyle,
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  } as ViewStyle,
  disabled: {
    opacity: 0.4,
  } as ViewStyle,
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  iconLeft: {
    marginRight: Spacing.sm,
  } as ViewStyle,
  iconRight: {
    marginLeft: Spacing.sm,
  } as ViewStyle,
  label: {
    fontFamily: FontFamily.semiBold,
    textAlign: 'center',
  } as TextStyle,

  // Sizes
  small: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    container: {},
    label: { fontSize: 13, lineHeight: 18 },
  } as any,
  medium: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    container: {},
    label: { fontSize: 15, lineHeight: 22 },
  } as any,
  large: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    container: {},
    label: { fontSize: 16, lineHeight: 24 },
  } as any,

  // Variants
  filled: {
    container: { backgroundColor: Colors.primary },
    label: { color: Colors.textOnPrimary },
  } as any,
  tonal: {
    container: { backgroundColor: Colors.primaryLight },
    label: { color: Colors.primary },
  } as any,
  outlined: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
    label: { color: Colors.primary },
  } as any,
  text: {
    container: { backgroundColor: 'transparent' },
    label: { color: Colors.primary },
  } as any,
  error: {
    container: { backgroundColor: Colors.error },
    label: { color: Colors.textOnPrimary },
  } as any,
});
