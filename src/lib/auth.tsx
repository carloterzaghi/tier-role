import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { auth, db, loadRememberMe, setRememberMe } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signUp: (name: string, email: string, password: string, remember: boolean) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de <AuthProvider />');
  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    // A preferência "Lembrar" precisa estar carregada antes de o Auth ler a sessão.
    loadRememberMe().finally(() => {
      unsubscribe = onAuthStateChanged(auth, (next) => {
        setUser(next);
        setIsLoading(false);
      });
    });
    return () => unsubscribe?.();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async signIn(email, password, remember) {
        setRememberMe(remember);
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(
          doc(db, 'users', cred.user.uid),
          {
            name: cred.user.displayName || email.trim().split('@')[0],
            lastSeenAt: serverTimestamp(),
          },
          { merge: true },
        );
      },
      async signUp(name, email, password, remember) {
        setRememberMe(remember);
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: name.trim(),
          createdAt: serverTimestamp(),
        });
      },
      async signOut() {
        await firebaseSignOut(auth);
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Traduz códigos de erro do Firebase Auth para mensagens amigáveis. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/missing-password':
      return 'Informe a senha.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente em instantes.';
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique sua internet.';
    default:
      return 'Algo deu errado. Tente novamente.';
  }
}
