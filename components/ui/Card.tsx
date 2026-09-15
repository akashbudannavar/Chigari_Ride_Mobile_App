import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

type CardVariant = 'elevated' | 'filled' | 'outlined';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
}

export function Card({
  children,
  variant = 'elevated',
  onPress,
  style,
  padding = Spacing.base,
}: CardProps) {
  const cardStyle = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'filled' && styles.filled,
    variant === 'outlined' && styles.outlined,
    { padding },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        onPress={onPress}
        android_ripple={{ color: Colors.surfaceVariant, borderless: false }}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
  },
  elevated: {
    ...Shadows.low,
  },
  filled: {
    backgroundColor: Colors.surfaceVariant,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.outline,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
});
