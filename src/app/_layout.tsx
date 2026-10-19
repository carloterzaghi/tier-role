import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { LogBox } from 'react-native';

import { Brand } from '@/constants/brand';
import { AuthProvider, useAuth } from '@/lib/auth';

// O aviso de BloomFilter do Firestore no React Native é inofensivo (fallback automático de sincronização)
LogBox.ignoreLogs(['@firebase/firestore: Firestore', 'BloomFilter error']);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 1000 * 60 * 60 * 24,
            retry: 1,
            refetchOnReconnect: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <SplashScreenController />
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** Mantém a splash visível até o Firebase restaurar a sessão salva. */
function SplashScreenController() {
  const { isLoading } = useAuth();
  if (!isLoading) SplashScreen.hide();
  return null;
}

function RootNavigator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) queryClient.clear();
  }, [user, queryClient]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Brand.bg } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
    </Stack>
  );
}
