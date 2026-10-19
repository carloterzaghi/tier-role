import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Utilitário seguro para feedback tátil.
 * Suprime silenciosamente erros em ambientes sem motor tátil (ex.: emulador ou web).
 */
export const haptic = {
  selection() {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
  },
  light() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  },
  medium() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  },
  heavy() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
  },
  success() {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  },
  error() {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  },
};
