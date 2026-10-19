import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/brand';
import type { Tag } from '@/lib/places';

/** Faixa horizontal de tags para filtrar; "Todas" limpa o filtro. */
export function TagChips({
  tags,
  selected,
  onSelect,
}: {
  tags: Tag[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled">
      <Chip label="Todas" active={selected === null} onPress={() => onSelect(null)} />
      {tags.map((tag) => (
        <Chip
          key={tag.id}
          label={`#${tag.name}`}
          active={selected === tag.id}
          onPress={() => onSelect(selected === tag.id ? null : tag.id)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 16,
    height: 38,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  chipActive: { backgroundColor: Brand.accent, borderColor: Brand.accent },
  chipText: { color: Brand.textMuted, fontSize: 14, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
});
