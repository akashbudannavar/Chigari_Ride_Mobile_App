import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Bus, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { BRTSStop } from '@/types/transit';
import { Text } from '@/components/ui/Text';
import { FontFamily, Radius, Shadows } from '@/constants/theme';

interface StopSuggestionListProps {
  suggestions: BRTSStop[];
  onSelectStop: (stop: BRTSStop) => void;
  visible: boolean;
  topOffset?: number;
}

export const StopSuggestionList: React.FC<StopSuggestionListProps> = ({
  suggestions,
  onSelectStop,
  visible,
  topOffset = 64,
}) => {
  if (!visible || suggestions.length === 0) return null;

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={[styles.floatingDropdown, { top: topOffset }]}>
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      >
        {suggestions.map((stop, index) => {
          const isLast = index === suggestions.length - 1;
          return (
            <Pressable
              key={stop.id}
              style={({ pressed }) => [
                styles.itemRow,
                pressed && styles.itemPressed,
                !isLast && styles.itemBorder,
              ]}
              onPress={() => {
                triggerHaptic();
                onSelectStop(stop);
              }}
            >
              {/* Transit Station Icon */}
              <View style={styles.iconCircle}>
                <Bus size={15} color="#2E7D32" strokeWidth={2.4} />
              </View>

              {/* Stop Titles */}
              <View style={styles.textColumn}>
                <Text style={styles.stopNameText} numberOfLines={1}>
                  {stop.name}
                </Text>
                {stop.kannadaName && (
                  <Text style={styles.kannadaText} numberOfLines={1}>
                    {stop.kannadaName}
                  </Text>
                )}
              </View>

              {/* Chigari BRTS Badge */}
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>Chigari • BRTS</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingDropdown: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    maxHeight: 220,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    zIndex: 999,
    ...Shadows.high,
    overflow: 'hidden',
  },
  scrollView: {
    flexGrow: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
  },
  itemPressed: {
    backgroundColor: '#F1F5F9',
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textColumn: {
    flex: 1,
  },
  stopNameText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  kannadaText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  badgePill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  badgePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '700',
  },
});

export default StopSuggestionList;
