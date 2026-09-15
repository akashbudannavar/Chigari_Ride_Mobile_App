/**
 * CHIGARI RIDE — Material Design 3 Design System
 * Centralized design tokens for colors, typography, spacing, radius, shadows.
 * Every screen and component imports from here to guarantee visual consistency.
 */

// ─── COLOR SYSTEM ───────────────────────────────────────────────────────────

export const Colors = {
  // Brand
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  primaryLight: '#E3F2FD',

  secondary: '#42A5F5',
  secondaryDark: '#1E88E5',
  secondaryLight: '#BBDEFB',

  accent: '#64B5F6',

  // Semantic
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#F9A825',
  warningLight: '#FFF8E1',
  error: '#C62828',
  errorLight: '#FFEBEE',

  // Surfaces
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F2F5',
  surfaceDim: '#E8EAF0',
  inverseSurface: '#1A1C20',

  // Text
  textPrimary: '#212121',
  textSecondary: '#616161',
  textTertiary: '#9E9E9E',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  textInverse: '#FFFFFF',

  // Borders & dividers
  outline: '#E0E0E0',
  outlineVariant: '#EEEEEE',
  divider: '#F0F0F0',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  scrim: 'rgba(0, 0, 0, 0.6)',
} as const;

// ─── SPACING SYSTEM (8px base) ───────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  huge: 64,
} as const;

// ─── BORDER RADIUS ───────────────────────────────────────────────────────────

export const Radius = {
  none: 0,
  sm: 8,
  md: 12,
  card: 20,
  button: 16,
  input: 16,
  bottomSheet: 24,
  pill: 100,
  full: 9999,
} as const;

// ─── ELEVATION / SHADOWS (MD3) ───────────────────────────────────────────────

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  high: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  highest: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────

export const FontFamily = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
} as const;

export type TypographyVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'headlineSmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'labelSmall'
  | 'caption';

export const Typography: Record<TypographyVariant, {
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700';
  lineHeight: number;
  letterSpacing?: number;
}> = {
  displayLarge:   { fontFamily: FontFamily.bold,    fontSize: 36, fontWeight: '700', lineHeight: 44, letterSpacing: -0.5 },
  displayMedium:  { fontFamily: FontFamily.bold,    fontSize: 28, fontWeight: '700', lineHeight: 36, letterSpacing: -0.25 },
  displaySmall:   { fontFamily: FontFamily.semiBold, fontSize: 24, fontWeight: '600', lineHeight: 32 },

  headlineLarge:  { fontFamily: FontFamily.semiBold, fontSize: 22, fontWeight: '600', lineHeight: 28 },
  headlineMedium: { fontFamily: FontFamily.semiBold, fontSize: 20, fontWeight: '600', lineHeight: 26 },
  headlineSmall:  { fontFamily: FontFamily.medium,  fontSize: 18, fontWeight: '500', lineHeight: 24 },

  titleLarge:     { fontFamily: FontFamily.semiBold, fontSize: 18, fontWeight: '600', lineHeight: 24 },
  titleMedium:    { fontFamily: FontFamily.medium,   fontSize: 16, fontWeight: '500', lineHeight: 22, letterSpacing: 0.15 },
  titleSmall:     { fontFamily: FontFamily.medium,   fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },

  bodyLarge:      { fontFamily: FontFamily.regular,  fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0.15 },
  bodyMedium:     { fontFamily: FontFamily.regular,  fontSize: 14, fontWeight: '400', lineHeight: 20, letterSpacing: 0.25 },
  bodySmall:      { fontFamily: FontFamily.regular,  fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0.4 },

  labelLarge:     { fontFamily: FontFamily.medium,   fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
  labelMedium:    { fontFamily: FontFamily.medium,   fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
  labelSmall:     { fontFamily: FontFamily.medium,  fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },

  caption:        { fontFamily: FontFamily.regular,  fontSize: 11, fontWeight: '400', lineHeight: 14, letterSpacing: 0.4 },
};

// ─── ANIMATION DURATIONS ─────────────────────────────────────────────────────

export const Animations = {
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;

// ─── LAYOUT CONSTANTS ────────────────────────────────────────────────────────

export const Layout = {
  screenPaddingHorizontal: Spacing.base,
  cardPadding: Spacing.base,
  tabBarHeight: 64,
  headerHeight: 56,
  maxContentWidth: 448,
  touchTargetMin: 44,
} as const;
