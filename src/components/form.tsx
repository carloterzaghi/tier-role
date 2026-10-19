import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand } from '@/constants/brand';

/** Campo de texto com label, foco destacado e botão de mostrar/ocultar senha. */
export function Field({
  label,
  secure,
  ...props
}: ComponentProps<typeof TextInput> & { label: string; secure?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, props.multiline && styles.inputMultiline, focused && styles.inputFocused]}>
        <TextInput
          {...props}
          secureTextEntry={secure && hidden}
          placeholderTextColor={Brand.textMuted}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, props.multiline && styles.inputTextMultiline]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button">
            <Text style={styles.toggle}>{hidden ? 'Mostrar' : 'Ocultar'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Checkbox simples (usado em "Lembrar da conta"). */
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={styles.checkRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

/** Botão principal com gradiente e estado de carregamento. */
export function GradientButton({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btnWrap,
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85, transform: [{ scale: 0.98 }] },
      ]}>
      <LinearGradient
        colors={Brand.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 6 },
  label: { color: Brand.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
  },
  inputFocused: { borderColor: Brand.accent, backgroundColor: Brand.surfaceHigh },
  inputMultiline: { height: undefined, minHeight: 110, alignItems: 'flex-start', paddingVertical: 12 },
  inputTextMultiline: { height: undefined, minHeight: 84, textAlignVertical: 'top' },
  input: { flex: 1, color: Brand.text, fontSize: 16, height: '100%', outlineStyle: 'none' } as never,
  toggle: { color: Brand.accent, fontSize: 13, fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  tick: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: -1 },
  checkLabel: { color: Brand.text, fontSize: 15 },
  btnWrap: { borderRadius: 14, overflow: 'hidden' },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.4 },
});
