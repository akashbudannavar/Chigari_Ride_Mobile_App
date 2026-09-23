/**
 * CHIGARI RIDE — Material Design 3 Design System
 * Centralized design tokens for colors, typography, spacing, radius, shadows.
 * Every screen and component imports from here to guarantee visual consistency.
 */

// ─── COLOR SYSTEM ───────────────────────────────────────────────────────────

export const Colors = {
  // Brand (Green #2E7D32 & Orange #F57C00 from Reference)
  primary: '#2E7D32',         // Sustainability Green
  primaryDark: '#1B5E20',
  primaryLight: '#E8F5E9',    // Light Green Background / Accent

  secondary: '#F57C00',       // Transport Orange
  secondaryDark: '#E65100',
  secondaryLight: '#FFF3E0',

  accent: '#43A047',

  // Information & Helpers
  info: '#1976D2',            // Information Blue
  infoLight: '#E3F2FD',

  // Semantic
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#F57C00',
  warningLight: '#FFF3E0',
  error: '#D32F2F',
  errorLight: '#FFEBEE',

  // Surfaces
  background: '#F8F9FA',      // Clean off-white light background
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',  // Grey container background from reference
  surfaceDim: '#ECEFF1',
  inverseSurface: '#1A1C20',

  // Text
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  textInverse: '#FFFFFF',

  // Borders & dividers
  outline: '#E2E8F0',
  outlineVariant: '#F1F5F9',
  divider: '#EEEEEE',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',
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
  circle: 9999,
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
