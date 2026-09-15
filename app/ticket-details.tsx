import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/theme';

export default function TicketDetailsScreen() {
  return (
    <Screen>
      <View style={styles.placeholder}>
        <Text variant="headlineMedium" align="center">
          Ticket Details
        </Text>
        <Text variant="bodyMedium" color={Colors.textSecondary} align="center" style={styles.subtitle}>
          Coming in the next phase
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 8,
  },
});
