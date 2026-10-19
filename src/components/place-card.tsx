import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { haptic } from '@/lib/haptics';
import type { Place } from '@/lib/places';

export function ratingColor(value: number) {
  if (value >= 7.5) return Brand.success;
  if (value >= 5) return '#FBBF24';
  return Brand.danger;
}

function PlaceCardBase({ place, onPress }: { place: Place; onPress?: () => void }) {
  const rated = place.reviewCount > 0;

  function handlePress() {
    haptic.selection();
    onPress?.();
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={place.name}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}>
      <View style={styles.cover}>
        {place.coverThumbUrl ? (
          <Image
            source={{ uri: place.coverThumbUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <LinearGradient colors={['#2A2A3F', '#1A1A28']} style={styles.noCover}>
            <Text style={styles.noCoverIcon}>📍</Text>
          </LinearGradient>
        )}
        <View style={styles.badge}>
          <Text style={[styles.badgeStar, { color: rated ? ratingColor(place.avgRating) : Brand.textMuted }]}>
            ★
          </Text>
          <Text style={styles.badgeText}>{rated ? place.avgRating.toFixed(1) : 'Novo'}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name}
        </Text>
        {place.address ? (
          <Text style={styles.address} numberOfLines={1}>
            {place.address}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <View style={styles.tags}>
            {place.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {place.tags.length > 3 ? <Text style={styles.more}>+{place.tags.length - 3}</Text> : null}
          </View>
          <Text style={styles.count}>
            {place.reviewCount} {place.reviewCount === 1 ? 'avaliação' : 'avaliações'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const PlaceCard = memo(PlaceCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    overflow: 'hidden',
  },
  cover: { height: 150, backgroundColor: Brand.surfaceHigh },
  noCover: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noCoverIcon: { fontSize: 40, opacity: 0.6 },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(11,11,18,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeStar: { fontSize: 14 },
  badgeText: { color: Brand.text, fontSize: 14, fontWeight: '800' },
  body: { padding: 14, gap: 4 },
  name: { color: Brand.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  address: { color: Brand.textMuted, fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  tag: { backgroundColor: 'rgba(139,92,246,0.16)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  tagText: { color: '#B7A0FF', fontSize: 12, fontWeight: '700' },
  more: { color: Brand.textMuted, fontSize: 12, fontWeight: '700' },
  count: { color: Brand.textMuted, fontSize: 12 },
});
