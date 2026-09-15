import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  subtitle?: string;
}

export function SectionHeader({ title, action, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text variant="titleMedium">{title}</Text>
        {subtitle && (
          <Text variant="bodySmall" color={Colors.textSecondary} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
});
