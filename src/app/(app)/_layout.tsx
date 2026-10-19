import { Stack } from 'expo-router';

import { Brand } from '@/constants/brand';

/** Garante que a Home fique embaixo das telas do grupo, mesmo se o app abrir direto numa delas. */
export const unstable_settings = { anchor: 'index' };

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Brand.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="place/[id]" />
      <Stack.Screen name="place/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="place/[id]/review" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
