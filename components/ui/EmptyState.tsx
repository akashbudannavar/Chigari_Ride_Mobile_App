import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text variant="titleMedium" align="center" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" color={Colors.textSecondary} align="center" style={styles.message}>
        {message}
      </Text>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.huge,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: Spacing.lg,
  },
});
