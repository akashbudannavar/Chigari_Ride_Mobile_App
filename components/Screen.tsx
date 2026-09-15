import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  backgroundColor?: string;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
}

export function Screen({
  children,
  scroll = false,
  style,
  backgroundColor = Colors.background,
  safeAreaTop = true,
  safeAreaBottom = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: safeAreaTop ? insets.top : 0,
    paddingBottom: safeAreaBottom ? insets.bottom : 0,
  };

  if (scroll) {
    return (
      <View style={containerStyle}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
});
