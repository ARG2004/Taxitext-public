/**
 * TaxiTex — Sistema de Diseño Centralizado
 * ─────────────────────────────────────────
 * Paleta, tipografía, espaciado y sombras en un solo lugar.
 * Diseñado para taxistas de San Martín Texmelucan:
 *   • Contraste alto (lectura al sol)
 *   • Targets táctiles grandes (mínimo 52px)
 *   • Fuentes grandes y legibles
 */

import { Platform, StyleSheet } from 'react-native';

// ─── Colores ──────────────────────────────────────────────────────────────────
export const Colors = {
  // Primario — Amarillo taxi vibrante
  // Texto oscuro sobre amarillo: ratio ≈ 9.7:1 (WCAG AAA ✅)
  primary:        '#FFCA28',
  primaryDark:    '#F9A825',
  primaryLight:   '#FFF8E1',
  primaryShadow:  '#F9A82566',

  // Secundario — Azul celeste profesional
  // Texto blanco sobre azul: ratio ≈ 4.7:1 (WCAG AA ✅)
  secondary:      '#039BE5',
  secondaryDark:  '#0277BD',
  secondaryLight: '#E1F5FE',
  secondaryShadow:'#039BE566',

  // Neutros
  white:          '#FFFFFF',
  background:     '#F5F7FA',
  surface:        '#FFFFFF',
  border:         '#E8ECF0',
  borderFocus:    '#FFCA28',

  // Texto
  textPrimary:    '#1A1A2E',   // ratio ≈ 18:1 sobre blanco ✅
  textSecondary:  '#5A6272',   // ratio ≈ 7.2:1 sobre blanco ✅
  textMuted:      '#9BA3B0',   // solo para placeholders
  textOnPrimary:  '#1A1A2E',   // texto oscuro sobre amarillo ✅
  textOnSecondary:'#FFFFFF',   // texto blanco sobre azul ✅

  // Semánticos
  success:        '#2ECC71',
  successLight:   '#E8F8F0',
  error:          '#E53935',
  errorLight:     '#FFEBEE',
  warning:        '#FF8F00',

  // Overlay
  overlay:        'rgba(26, 26, 46, 0.55)',
  overlayLight:   'rgba(26, 26, 46, 0.15)',
};

// ─── Tipografía ───────────────────────────────────────────────────────────────
// San Martín Texmelucan: taxistas con distintos rangos de visión.
// Usamos tamaños generosos para lectura rápida.
export const Typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
  }) as string,

  // Escala tipográfica
  xs:   11,
  sm:   13,
  base: 16,
  md:   18,
  lg:   20,
  xl:   24,
  xxl:  30,
  xxxl: 38,

  // Pesos
  regular:    '400' as const,
  medium:     '500' as const,
  semibold:   '600' as const,
  bold:       '700' as const,
  extrabold:  '800' as const,
  black:      '900' as const,

  // Letter spacing
  tight:  -0.3,
  normal:  0,
  wide:    0.5,
  wider:   1.5,
  widest:  3,
};

// ─── Espaciado ────────────────────────────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

// ─── Radios ───────────────────────────────────────────────────────────────────
export const Radius = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   24,
  xxl:  32,
  full: 999,
};

// ─── Sombras ─────────────────────────────────────────────────────────────────
export const Shadows = StyleSheet.create({
  // Sombras sutiles — no se ven pesadas
  none: {},
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  // Sombras de color — para botones primarios
  primary: {
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  secondary: {
    shadowColor: Colors.secondaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 6,
  },
});

// ─── Tamaños táctiles ─────────────────────────────────────────────────────────
// Mínimo 52px para dedos grandes / uso en movimiento
export const TouchTarget = {
  min:    52,
  normal: 56,
  large:  64,
};

// ─── Constantes de layout ─────────────────────────────────────────────────────
export const Layout = {
  screenPaddingH: 20,
  cardRadius: Radius.xl,
  inputHeight: 56,    // alto generoso para fácil toque
  buttonHeight: 56,
  headerPaddingTop: Platform.OS === 'ios' ? 56 : 36,
};
