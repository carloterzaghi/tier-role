import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Checkbox, Field, GradientButton } from '@/components/form';
import { Brand } from '@/constants/brand';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';

export default function SignUp() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      haptic.error();
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      haptic.error();
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(name, email, password, remember);
      haptic.success();
    } catch (e) {
      haptic.error();
      setError(authErrorMessage(e));
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Criar conta" subtitle="Leva menos de um minuto.">
      <Field
        label="Nome"
        value={name}
        onChangeText={setName}
        placeholder="Como quer ser chamado"
        autoComplete="name"
        textContentType="name"
      />
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
        placeholder="Mínimo de 6 caracteres"
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
      />
      <Checkbox checked={remember} onChange={setRemember} label="Lembrar da conta" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GradientButton title="Criar conta" onPress={submit} loading={loading} />
      <View style={styles.footer}>
        <Text style={styles.muted}>Já tem conta? </Text>
        <Link href="/sign-in" style={styles.link}>
          Entrar
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
