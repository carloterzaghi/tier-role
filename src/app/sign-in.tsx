import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Checkbox, Field, GradientButton } from '@/components/form';
import { Brand } from '@/constants/brand';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      haptic.error();
      setError('Preencha e-mail e senha.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password, remember);
      haptic.success();
      // O redirecionamento é automático: a rota protegida muda quando o usuário loga.
    } catch (e) {
      haptic.error();
      setError(authErrorMessage(e));
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Bem-vindo de volta" subtitle="Entre para avaliar e descobrir lugares.">
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="voce@email.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Senha"
        value={password}
        onChangeText={setPassword}
        placeholder="Sua senha"
        secure
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      <Checkbox checked={remember} onChange={setRemember} label="Lembrar da conta" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GradientButton title="Entrar" onPress={submit} loading={loading} />
      <View style={styles.footer}>
        <Text style={styles.muted}>Não tem conta? </Text>
        <Link href="/sign-up" style={styles.link}>
          Criar conta
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  error: {
    color: Brand.danger,
    fontSize: 14,
    backgroundColor: 'rgba(255,84,112,0.12)',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  muted: { color: Brand.textMuted, fontSize: 15 },
  link: { color: Brand.accent, fontSize: 15, fontWeight: '700' },
});
