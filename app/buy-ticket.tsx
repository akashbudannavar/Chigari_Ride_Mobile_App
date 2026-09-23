import { StyleSheet, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, Spacing } from '@/constants/theme';

export default function BuyTicketScreen() {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={styles.headerTop}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}
            onPress={handleBack}
            hitSlop={12}
          >
            <ChevronLeft size={22} color={Colors.textOnPrimary} strokeWidth={2.5} />
          </Pressable>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Buy Ticket
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <View style={styles.placeholder}>
        <Text variant="headlineMedium" align="center">
          Buy Ticket
        </Text>
        <Text variant="bodyMedium" color={Colors.textSecondary} align="center" style={styles.subtitle}>
          Coming in the next phase
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 8,
  },
});
