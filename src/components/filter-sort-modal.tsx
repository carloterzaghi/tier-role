import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { haptic } from '@/lib/haptics';

export type SortOption = 'newest' | 'oldest' | 'name' | 'rating';
export type RatingFilter = 'all' | 'top' | 'mid' | 'low' | 'unrated';

export function getSortLabel(option: SortOption): string {
  switch (option) {
    case 'name':
      return 'Nome (A-Z)';
    case 'oldest':
      return 'Mais velhos';
    case 'rating':
      return 'Maior nota';
    case 'newest':
    default:
      return 'Mais novos';
  }
}

export function getRatingFilterLabel(filter: RatingFilter): string {
  switch (filter) {
    case 'top':
      return '★ 7.5+ (Top)';
    case 'mid':
      return '★ 5.0 - 7.4';
    case 'low':
      return '★ < 5.0';
    case 'unrated':
      return 'Sem nota';
    case 'all':
    default:
      return 'Todas as notas';
  }
}

const SORT_ITEMS: { id: SortOption; label: string; desc: string; icon: string }[] = [
  { id: 'newest', label: 'Mais novo adicionado', desc: 'Locais cadastrados recentemente primeiro', icon: '🕒' },
  { id: 'oldest', label: 'Mais velho adicionado', desc: 'Primeiros locais cadastrados primeiro', icon: '📅' },
  { id: 'rating', label: 'Nota total do local', desc: 'Melhores avaliados primeiro (maior nota)', icon: '⭐' },
  { id: 'name', label: 'Nome do local (A-Z)', desc: 'Ordem alfabética de A a Z', icon: '🔤' },
];

const RATING_ITEMS: { id: RatingFilter; label: string; desc: string; icon: string }[] = [
  { id: 'all', label: 'Todas as notas', desc: 'Exibir todos os locais cadastrados', icon: '✨' },
  { id: 'top', label: 'Top Tier (★ 7.5 a 10)', desc: 'Locais com avaliações excelentes', icon: '🟢' },
  { id: 'mid', label: 'Médio (★ 5.0 a 7.4)', desc: 'Locais com avaliações boas ou regulares', icon: '🟡' },
  { id: 'low', label: 'Abaixo de 5.0 (< ★ 5.0)', desc: 'Locais com notas mais baixas', icon: '🔴' },
  { id: 'unrated', label: 'Ainda sem avaliações', desc: 'Locais novos aguardando a primeira nota', icon: '⚪' },
];

type ModalProps<T> = {
  visible: boolean;
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

export function SortModal({ visible, selected, onSelect, onClose }: ModalProps<SortOption>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>Ordenar locais</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityRole="button">
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.optionsList}>
              {SORT_ITEMS.map((item) => {
                const isSelected = item.id === selected;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      haptic.selection();
                      onSelect(item.id);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}>
                    <View style={styles.iconCircle}>
                      <Text style={styles.optionIcon}>{item.icon}</Text>
                    </View>

                    <View style={styles.optionTextCol}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {item.label}
                      </Text>
                      <Text style={styles.optionDesc}>{item.desc}</Text>
                    </View>

                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

export function RatingFilterModal({
  visible,
  selected,
  onSelect,
  onClose,
}: ModalProps<RatingFilter>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>Filtrar por nota total</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityRole="button">
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.optionsList}>
              {RATING_ITEMS.map((item) => {
                const isSelected = item.id === selected;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      haptic.selection();
                      onSelect(item.id);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}>
                    <View style={styles.iconCircle}>
                      <Text style={styles.optionIcon}>{item.icon}</Text>
                    </View>

                    <View style={styles.optionTextCol}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {item.label}
                      </Text>
                      <Text style={styles.optionDesc}>{item.desc}</Text>
                    </View>

                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    width: '100%',
  },
  sheet: {
    backgroundColor: Brand.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  title: {
    color: Brand.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Brand.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: Brand.surfaceHigh,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  optionRowSelected: {
    borderColor: Brand.accent,
    backgroundColor: 'rgba(255, 107, 74, 0.08)',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: {
    fontSize: 18,
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: Brand.text,
    fontSize: 14,
    fontWeight: '700',
  },
  optionLabelSelected: {
    color: Brand.accent,
    fontWeight: '800',
  },
  optionDesc: {
    color: Brand.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Brand.accent,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Brand.accent,
  },
});
