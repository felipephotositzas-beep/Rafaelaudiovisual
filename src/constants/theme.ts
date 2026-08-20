/**
 * Rafael Publicado Audiovisual - Design Tokens & Theme
 * Conceito: "Momentos em movimento, eternizados com precisão."
 * Tema Claro (Light Mode)
 */

import '@/global.css';
import { Platform, type TextStyle } from 'react-native';

export const BrandColors = {
  // Azul da marca (assinatura visual)
  primary: '#006BD6',
  primaryDeep: '#063A78',
  primaryLight: '#0088FF',
  primaryHover: '#007BF5',
  primaryActive: '#0058B3',
  primarySubtle: 'rgba(0, 107, 214, 0.08)',
  primaryGlow: 'rgba(0, 107, 214, 0.20)',
  
  gradientInstitucional: 'linear-gradient(135deg, #063A78 0%, #006BD6 55%, #009DFF 100%)',
} as const;

export const LightPalette = {
  // Backgrounds
  background: '#F8FAFC',          // Fundo geral claro e moderno
  backgroundSubtle: '#F1F5F9',    // Fundo secundário para separação
  backgroundMuted: '#E2E8F0',     // Áreas de apoio
  
  // Superfícies / Cards
  surface: '#FFFFFF',             // Fundo dos cards e superfícies brancos
  surfaceAlpha: 'rgba(255, 255, 255, 0.92)',
  surfaceHover: '#F8FAFC',
  surfaceActive: '#F1F5F9',
  
  // Textos
  textPrimary: '#0F172A',         // Texto principal preto/chumbo escuro
  textSecondary: '#475569',       // Texto secundário legível
  textMuted: '#64748B',           // Texto discreto
  textDisabled: '#94A3B8',
  
  // Bordas e Divisores
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderStrong: '#CBD5E1',
  borderPrimary: 'rgba(0, 107, 214, 0.35)',
  borderPrimaryHover: '#006BD6',
  
  // Cores de Feedback
  success: '#10B981',
  successSubtle: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',
  errorSubtle: 'rgba(239, 68, 68, 0.12)',
  info: '#006BD6',
} as const;

export const DarkPalette = LightPalette;

export const SemanticColors = {
  light: LightPalette,
  dark: LightPalette,
} as const;

export const Colors = {
  light: {
    text: LightPalette.textPrimary,
    background: LightPalette.background,
    backgroundSubtle: LightPalette.backgroundSubtle,
    backgroundMuted: LightPalette.backgroundMuted,
    backgroundElement: LightPalette.backgroundMuted,
    backgroundSelected: LightPalette.surfaceActive,
    textSecondary: LightPalette.textSecondary,
    textMuted: LightPalette.textMuted,
    textDisabled: LightPalette.textDisabled,
    border: LightPalette.border,
    borderStrong: LightPalette.borderStrong,
    borderPrimary: LightPalette.borderPrimary,
    surface: LightPalette.surface,
    surfaceHover: LightPalette.surfaceHover,
    surfaceActive: LightPalette.surfaceActive,
    primary: BrandColors.primary,
    primaryDeep: BrandColors.primaryDeep,
    primaryLight: BrandColors.primaryLight,
    primaryHover: BrandColors.primaryHover,
    primaryActive: BrandColors.primaryActive,
    primarySubtle: BrandColors.primarySubtle,
    primaryGlow: BrandColors.primaryGlow,
    gradient: BrandColors.gradientInstitucional,
    success: LightPalette.success,
    successSubtle: LightPalette.successSubtle,
    error: LightPalette.error,
    errorSubtle: LightPalette.errorSubtle,
    warning: LightPalette.warning,
    warningSubtle: LightPalette.warningSubtle,
    info: LightPalette.info,
    scrimStrong: 'rgba(15, 23, 42, 0.7)',
    onPrimary: '#FFFFFF',
  },
  dark: {
    text: LightPalette.textPrimary,
    background: LightPalette.background,
    backgroundSubtle: LightPalette.backgroundSubtle,
    backgroundMuted: LightPalette.backgroundMuted,
    backgroundElement: LightPalette.backgroundMuted,
    backgroundSelected: LightPalette.surfaceActive,
    textSecondary: LightPalette.textSecondary,
    textMuted: LightPalette.textMuted,
    textDisabled: LightPalette.textDisabled,
    border: LightPalette.border,
    borderStrong: LightPalette.borderStrong,
    borderPrimary: LightPalette.borderPrimary,
    surface: LightPalette.surface,
    surfaceHover: LightPalette.surfaceHover,
    surfaceActive: LightPalette.surfaceActive,
    primary: BrandColors.primary,
    primaryDeep: BrandColors.primaryDeep,
    primaryLight: BrandColors.primaryLight,
    primaryHover: BrandColors.primaryHover,
    primaryActive: BrandColors.primaryActive,
    primarySubtle: BrandColors.primarySubtle,
    primaryGlow: BrandColors.primaryGlow,
    gradient: BrandColors.gradientInstitucional,
    success: LightPalette.success,
    successSubtle: LightPalette.successSubtle,
    error: LightPalette.error,
    errorSubtle: LightPalette.errorSubtle,
    warning: LightPalette.warning,
    warningSubtle: LightPalette.warningSubtle,
    info: LightPalette.info,
    scrimStrong: 'rgba(15, 23, 42, 0.7)',
    onPrimary: '#FFFFFF',
  }
} as const;

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
  ten: 40,
  twelve: 48,
  sixteen: 64,
} as const;

export const Radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

export const Typography = {
  fontFamily: Platform.select({
    web: 'Inter, system-ui, -apple-system, sans-serif',
    ios: 'System',
    android: 'Roboto',
    default: 'sans-serif',
  }),
  codeFontFamily: Platform.select({
    web: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    ios: 'Courier',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

export const FontWeights = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
} as const;

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    boxShadow: 'none',
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.1)',
  },
  glow: {
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    boxShadow: '0 4px 18px rgba(0, 107, 214, 0.3)',
  },
} as const;

export const Transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const Breakpoints = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1023,
  desktopMin: 1024,
} as const;

export const Layout = {
  maxWidth: 1280,
  containerLg: 1140,
  containerXl: 1240,
  desktopPadding: 32,
  tabletPadding: 24,
  mobilePadding: 16,
  gapXl: 40,
  gapLg: 24,
  gapMd: 16,
  gapSm: 12,
  gapXs: 8,
} as const;

export const theme = {
  colors: Colors.light,
  spacing: Spacing,
  radius: Radius,
  typography: Typography,
  fontWeights: FontWeights,
  shadows: Shadows,
  transitions: Transitions,
  breakpoints: Breakpoints,
  layout: Layout,
} as const;

export default theme;
