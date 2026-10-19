import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { haptic } from '@/lib/haptics';
import { MAX_TAG_LENGTH, MAX_TAGS, normalizeTag } from '@/lib/place-service';
import type { Tag } from '@/lib/places';

/**
 * Seleção de tags do local: escolhe entre as existentes (sugestões filtradas pelo texto)
 * ou cria uma nova digitando e tocando em "Adicionar".
 */
export function TagPicker({
  existing,
  selected,
  onChange,
}: {
  existing: Tag[];
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [text, setText] = useState('');
  const normalized = normalizeTag(text);
  const full = selected.length >= MAX_TAGS;

  const suggestions = useMemo(
    () =>
      existing
        .filter((t) => !selected.includes(t.id) && (!normalized || t.id.includes(normalized)))
        .slice(0, 12),
    [existing, selected, normalized],
  );

  const isNew = normalized.length > 0 && !existing.some((t) => t.id === normalized);

  function add(tag: string) {
    if (!tag || selected.includes(tag) || full) return;
    haptic.selection();
    onChange([...selected, tag]);
    setText('');
  }

  function remove(tag: string) {
    haptic.selection();
    onChange(selected.filter((t) => t !== tag));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Tags</Text>
        <Text style={styles.counter}>
          {selected.length}/{MAX_TAGS}
        </Text>
      </View>

      {selected.length > 0 ? (
        <View style={styles.row}>
          {selected.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => remove(tag)}
              style={[styles.chip, styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={`Remover tag ${tag}`}>
              <Text style={styles.chipSelectedText}>#{tag}  ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={full ? 'Limite de tags atingido' : 'Buscar ou criar tag (ex.: pizza)'}
          placeholderTextColor={Brand.textMuted}
          editable={!full}
          maxLength={MAX_TAG_LENGTH + 1}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => add(normalized)}
          style={styles.input}
        />
        <Pressable
          onPress={() => add(normalized)}
          disabled={!normalized || full}
          style={[styles.addBtn, (!normalized || full) && { opacity: 0.4 }]}
          accessibilityRole="button">
          <Text style={styles.addText}>{isNew ? 'Criar' : 'Adicionar'}</Text>
        </Pressable>
      </View>

      {suggestions.length > 0 ? (
        <View style={styles.row}>
          {suggestions.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => add(tag.id)}
              disabled={full}
              style={[styles.chip, full && { opacity: 0.4 }]}
              accessibilityRole="button">
              <Text style={styles.chipText}>#{tag.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: Brand.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  counter: { color: Brand.textMuted, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    color: Brand.text,
    fontSize: 16,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 14,
  },
  addBtn: {
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Brand.surfaceHigh,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  addText: { color: Brand.accent, fontWeight: '800', fontSize: 14 },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  chipText: { color: Brand.textMuted, fontSize: 13, fontWeight: '700' },
  chipSelected: { backgroundColor: 'rgba(255,107,74,0.16)', borderColor: Brand.accent },
  chipSelectedText: { color: Brand.accent, fontSize: 13, fontWeight: '800' },
});
