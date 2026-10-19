import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_VERSION, Brand } from '@/constants/brand';

/** Casca das telas de login/cadastro: fundo escuro com brilho e logo. */
export function AuthShell({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(255,107,74,0.28)', 'rgba(139,92,246,0.18)', 'transparent']}
        style={styles.glow}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={true}
            showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <LinearGradient colors={Brand.gradient} style={styles.logo}>
                <Text style={styles.logoText}>★</Text>
              </LinearGradient>
              <View style={styles.brandRow}>
                <Text style={styles.brand}>Tier Role</Text>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionBadgeText}>{APP_VERSION}</Text>
                </View>
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <View style={styles.form}>{children}</View>
              <View style={styles.footerVersionWrap}>
                <Text style={styles.footerVersionText}>Tier Role · {APP_VERSION}</Text>
                <View style={styles.poweredByRow}>
                  <Text style={styles.poweredByLabel}>Power By </Text>
                  <Text style={styles.poweredByName}>carlo.maker</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: { color: '#fff', fontSize: 30 },
  brand: { color: Brand.accent, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 107, 74, 0.15)',
    borderColor: 'rgba(255, 107, 74, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
  },
  versionBadgeText: {
    color: Brand.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: { color: Brand.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Brand.textMuted, fontSize: 16, marginTop: 6, marginBottom: 28 },
  form: { gap: 16 },
  footerVersionWrap: {
    marginTop: 28,
    alignItems: 'center',
    gap: 4,
  },
  footerVersionText: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poweredByLabel: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  poweredByName: {
    color: Brand.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
