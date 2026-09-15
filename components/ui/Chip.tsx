import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Colors, FontFamily, Radius, Spacing, Typography } from '@/constants/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  color?: string;
}

export function Chip({ label, selected = false, onPress, icon, color }: ChipProps) {
  const handlePress = () => {
    if (!onPress) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const activeColor = color ?? Colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        selected ? { ...styles.selected, backgroundColor: activeColor } : styles.unselected,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      disabled={!onPress}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelUnselected,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.pill,
    minHeight: 36,
  },
  unselected: {
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.outline,
  },
  selected: {
    borderWidth: 0,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  icon: {
    marginRight: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  labelSelected: {
    color: Colors.textOnPrimary,
  },
  labelUnselected: {
    color: Colors.textSecondary,
  },
});
