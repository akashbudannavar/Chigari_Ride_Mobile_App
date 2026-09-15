import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <MapPin size={48} color={Colors.primary} strokeWidth={2} />
        <Text variant="headlineMedium" style={styles.title}>
          Page Not Found
        </Text>
        <Text variant="bodyMedium" color={Colors.textSecondary} style={styles.message}>
          The screen you're looking for doesn't exist.
        </Text>
        <Link href="/" asChild>
          <Button label="Go Home" onPress={() => {}} style={styles.button} />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  title: {
    marginTop: Spacing.lg,
  },
  message: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.xl,
  },
});
