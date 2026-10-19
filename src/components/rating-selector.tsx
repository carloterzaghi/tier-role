import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { haptic } from '@/lib/haptics';
import { getTier } from '@/lib/reviews';

type Props = {
  value: number;
  onChange: (next: number) => void;
};

const PRESETS = [5, 7, 8, 9, 10];

function RatingSelectorBase({ value, onChange }: Props) {
  const tier = getTier(value);

  function adjust(delta: number) {
    const next = Math.min(10, Math.max(0, Math.round((value + delta) * 10) / 10));
    if (next !== value) {
      if (next === 10 || next === 0) haptic.heavy();
      else haptic.selection();
      onChange(next);
    }
  }

  function handlePreset(p: number) {
    if (p !== value) {
      haptic.light();
      onChange(p);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Sua nota (0 a 10)</Text>

      {/* Hero Badge da Nota */}
      <View style={[styles.heroBadge, { borderColor: tier.color, backgroundColor: tier.bg }]}>
        <View style={styles.scoreRow}>
          <Text style={[styles.star, { color: tier.color }]}>★</Text>
          <Text style={[styles.scoreValue, { color: Brand.text }]}>{value.toFixed(1)}</Text>
          <Text style={styles.scoreMax}>/ 10</Text>
        </View>

        <View style={[styles.tierTag, { backgroundColor: tier.color }]}>
          <Text style={styles.tierTagText}>
            TIER {tier.rank} · {tier.label.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Botões de ajuste fino (+/- 0.5 e +/- 1.0) */}
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => adjust(-1.0)}
          disabled={value <= 0}
          style={({ pressed }) => [styles.stepBtn, (value <= 0 || pressed) && styles.btnDisabled]}>
          <Text style={styles.stepBtnText}>- 1.0</Text>
        </Pressable>

        <Pressable
          onPress={() => adjust(-0.5)}
          disabled={value <= 0}
          style={({ pressed }) => [styles.stepBtn, (value <= 0 || pressed) && styles.btnDisabled]}>
          <Text style={styles.stepBtnText}>- 0.5</Text>
        </Pressable>

        <Pressable
          onPress={() => adjust(0.5)}
          disabled={value >= 10}
          style={({ pressed }) => [styles.stepBtn, (value >= 10 || pressed) && styles.btnDisabled]}>
          <Text style={styles.stepBtnText}>+ 0.5</Text>
        </Pressable>

        <Pressable
          onPress={() => adjust(1.0)}
          disabled={value >= 10}
          style={({ pressed }) => [styles.stepBtn, (value >= 10 || pressed) && styles.btnDisabled]}>
          <Text style={styles.stepBtnText}>+ 1.0</Text>
        </Pressable>
      </View>

      {/* Atalhos Rápidos */}
      <View style={styles.presetRow}>
        <Text style={styles.presetLabel}>Atalhos:</Text>
        {PRESETS.map((p) => {
          const isSelected = Math.abs(value - p) < 0.05;
          return (
            <Pressable
              key={p}
              onPress={() => handlePreset(p)}
              style={({ pressed }) => [
                styles.presetChip,
                isSelected && styles.presetChipActive,
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>{p}.0</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const RatingSelector = memo(RatingSelectorBase);

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    color: Brand.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heroBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 2,
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  star: {
    fontSize: 28,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreMax: {
    color: Brand.textMuted,
    fontSize: 20,
    fontWeight: '700',
  },
  tierTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tierTagText: {
    color: '#0B0B12',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepBtn: {
    flex: 1,
    height: 44,
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    color: Brand.text,
    fontSize: 14,
    fontWeight: '800',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  presetLabel: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  presetChipActive: {
    backgroundColor: Brand.accent,
    borderColor: Brand.accent,
  },
  presetText: {
    color: Brand.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  presetTextActive: {
    color: '#fff',
    fontWeight: '900',
  },
});
