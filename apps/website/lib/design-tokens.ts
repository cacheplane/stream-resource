/** Single source of truth for all brand design tokens.
 *  CSS custom properties in globals.css must match these values exactly.
 */
export const tokens = {
  colors: {
    bg: '#080B14',
    accent: '#6C8EFF',
    accentGlow: 'rgba(108, 142, 255, 0.35)',
    accentBorder: 'rgba(108, 142, 255, 0.15)',
    accentBorderHover: 'rgba(108, 142, 255, 0.40)',
    accentSurface: 'rgba(108, 142, 255, 0.08)',
    textPrimary: '#EEF1FF',
    textSecondary: '#8B96C8',
    textMuted: '#4A527A',
    sidebarBg: '#0A0D18',
    angularRed: '#DD0031',
  },
  glow: {
    hero: '0 0 40px rgba(108, 142, 255, 0.5)',
    demo: '0 0 30px rgba(108, 142, 255, 0.25)',
    card: '0 0 24px rgba(108, 142, 255, 0.3)',
    border: '0 0 12px rgba(108, 142, 255, 0.2)',
    button: '0 0 16px rgba(108, 142, 255, 0.4)',
  },
} as const;
