import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily, Radius, Spacing, Typography } from '@/constants/theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'accent';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: Colors.primaryLight, text: Colors.primary },
  success: { bg: Colors.successLight, text: Colors.success },
  warning: { bg: Colors.warningLight, text: Colors.warning },
  error: { bg: Colors.errorLight, text: Colors.error },
  neutral: { bg: Colors.surfaceVariant, text: Colors.textSecondary },
  accent: { bg: Colors.secondaryLight, text: Colors.secondaryDark },
};

export function Badge({ label, variant = 'neutral', icon }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View style={[styles.base, { backgroundColor: colors.bg }]}>
      {icon}
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
});
