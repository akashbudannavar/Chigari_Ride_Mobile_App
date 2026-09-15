import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { Colors, FontFamily, Typography, type TypographyVariant } from '@/constants/theme';

interface TextPropsExtended extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Text({
  variant = 'bodyMedium',
  color = Colors.textPrimary,
  align = 'left',
  style,
  children,
  ...props
}: TextPropsExtended) {
  const typography = Typography[variant];

  return (
    <RNText
      style={[
        {
          fontFamily: typography.fontFamily,
          fontSize: typography.fontSize,
          fontWeight: typography.fontWeight as any,
          lineHeight: typography.lineHeight,
          letterSpacing: typography.letterSpacing as any,
          color,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}
