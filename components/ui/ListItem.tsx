import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
  divider?: boolean;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onPress,
  showChevron = true,
  style,
  divider = false,
}: ListItemProps) {
  const content = (
    <View style={[styles.container, divider && styles.divider, style]}>
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      <View style={styles.textContainer}>
        <Text variant="titleMedium" numberOfLines={1}>{title}</Text>
        {subtitle && (
          <Text variant="bodySmall" color={Colors.textSecondary} numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      {showChevron && !rightIcon && onPress && (
        <View style={styles.rightIcon}>
          <ChevronRight size={20} color={Colors.textTertiary} strokeWidth={2} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => pressed && styles.pressed}
        onPress={onPress}
        android_ripple={{ color: Colors.surfaceVariant, borderless: false }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    minHeight: 56,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  leftIcon: {
    marginRight: Spacing.md,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
