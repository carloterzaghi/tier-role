import Constants from 'expo-constants';

/** Paleta da marca — visual escuro com destaque coral/violeta. */
export const Brand = {
  bg: '#0B0B12',
  surface: '#15151F',
  surfaceHigh: '#1E1E2B',
  border: '#2A2A3A',
  text: '#F5F5FA',
  textMuted: '#9A9AB0',
  accent: '#FF6B4A',
  accentAlt: '#8B5CF6',
  danger: '#FF5470',
  success: '#34D399',
  gradient: ['#FF6B4A', '#8B5CF6'] as const,
};

/** Versão oficial do aplicativo (lida de app.json ou padrão v1.0.0) */
export const APP_VERSION = `v${Constants.expoConfig?.version ?? '1.0.0'}`;
