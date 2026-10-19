import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const REMEMBER_KEY = 'tier-role.remember';

let remember = true;
/** Sessão em memória, usada quando "Lembrar da conta" está desmarcado. */
const memory = new Map<string, string>();

/**
 * Storage da sessão do Firebase Auth: com "Lembrar" marcado grava no AsyncStorage
 * (persiste até o logout); desmarcado, fica só em memória e some ao fechar o app.
 */
const sessionStorage = {
  async getItem(key: string) {
    return memory.get(key) ?? (await AsyncStorage.getItem(key));
  },
  async setItem(key: string, value: string) {
    if (remember) {
      memory.delete(key);
      await AsyncStorage.setItem(key, value);
    } else {
      memory.set(key, value);
      await AsyncStorage.removeItem(key);
    }
  },
  async removeItem(key: string) {
    memory.delete(key);
    await AsyncStorage.removeItem(key);
  },
};

const isFirstInit = getApps().length === 0;
export const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// initializeAuth só pode rodar uma vez (cuidado com Fast Refresh).
export const auth: Auth = isFirstInit
  ? initializeAuth(app, { persistence: getReactNativePersistence(sessionStorage) })
  : getAuth(app);

export const db = getFirestore(app);
export const storage = getStorage(app);

/** Define se a sessão deve persistir. Chamar ANTES de fazer login. */
export function setRememberMe(value: boolean) {
  remember = value;
  AsyncStorage.setItem(REMEMBER_KEY, value ? '1' : '0').catch(() => {});
}

/** Lê a preferência salva. Chamar no início do app, antes de ler a sessão. */
export async function loadRememberMe() {
  remember = (await AsyncStorage.getItem(REMEMBER_KEY)) !== '0';
  return remember;
}

export const isWeb = Platform.OS === 'web';
