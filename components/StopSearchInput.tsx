import React from 'react';
import { StyleSheet, View, TextInput, Pressable } from 'react-native';
import { CircleDot, MapPin, X } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius } from '@/constants/theme';

interface StopSearchInputProps {
  label: 'From' | 'To';
  query: string;
  placeholder: string;
  onQueryChange: (text: string) => void;
  onClear: () => void;
  onFocus?: () => void;
  iconType: 'origin' | 'destination';
}

export const StopSearchInput: React.FC<StopSearchInputProps> = ({
  label,
  query,
  placeholder,
  onQueryChange,
  onClear,
  onFocus,
  iconType,
}) => {
  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={iconType === 'origin' ? styles.originIconBox : styles.destIconBox}>
        {iconType === 'origin' ? (
          <CircleDot size={18} color="#2E7D32" strokeWidth={2.6} />
        ) : (
          <MapPin size={18} color="#F57C00" strokeWidth={2.6} />
        )}
      </View>

      {/* Input content */}
      <View style={styles.inputWrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.textInput}
          value={query}
          onChangeText={onQueryChange}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          autoCorrect={false}
          autoCapitalize="words"
        />
      </View>

      {/* Clear button */}
      {query.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
          onPress={onClear}
          hitSlop={8}
          accessibilityLabel={`Clear ${label}`}
        >
          <X size={16} color="#64748B" strokeWidth={2.2} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  originIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  textInput: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
    height: 24,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StopSearchInput;
