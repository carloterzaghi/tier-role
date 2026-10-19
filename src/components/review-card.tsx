import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { getTier, type Review } from '@/lib/reviews';

type Props = {
  review: Review;
  isCurrentUser: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPressPhoto?: (url: string) => void;
};

function formatDate(timestamp: number) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) return 'Agora há pouco';
    return `${diffHours}h atrás`;
  }
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return d.toLocaleDateString('pt-BR');
}

function ReviewCardBase({ review, isCurrentUser, onEdit, onDelete, onPressPhoto }: Props) {
  const tier = getTier(review.rating);
  const initials = (review.authorName || 'A')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');

  return (
    <View style={[styles.card, isCurrentUser && styles.cardSelf]}>
      {/* Cabeçalho: Autor + Data + Nota */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, isCurrentUser && styles.avatarSelf]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.authorName} numberOfLines={1}>
                {review.authorName}
              </Text>
              {isCurrentUser ? (
                <View style={styles.selfBadge}>
                  <Text style={styles.selfBadgeText}>Você</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>

        {/* Score & Tier Badge */}
        <View style={[styles.ratingBadge, { borderColor: tier.color, backgroundColor: tier.bg }]}>
          <Text style={[styles.ratingStar, { color: tier.color }]}>★</Text>
          <Text style={styles.ratingNumber}>{review.rating.toFixed(1)}</Text>
          <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
          <Text style={[styles.tierLabel, { color: tier.color }]}>Tier {tier.rank}</Text>
        </View>
      </View>

      {/* Comentário */}
      {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

      {/* Foto anexada */}
      {review.thumbUrl || review.photoUrl ? (
        <Pressable
          onPress={() => onPressPhoto?.(review.photoUrl || review.thumbUrl || '')}
          style={styles.photoWrap}
          accessibilityRole="button"
          accessibilityLabel="Ver foto ampliada">
          <Image
            source={{ uri: review.thumbUrl || review.photoUrl || '' }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.photoOverlay}>
            <Text style={styles.photoHint}>🔍 Toque para ampliar</Text>
          </View>
        </Pressable>
      ) : null}

      {/* Ações de Edição (se for a avaliação do usuário atual) */}
      {isCurrentUser && (onEdit || onDelete) ? (
        <View style={styles.actionsRow}>
          {onEdit ? (
            <Pressable onPress={onEdit} style={styles.actionBtn} accessibilityRole="button">
              <Text style={styles.actionTextEdit}>✏️ Editar avaliação</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable onPress={onDelete} style={styles.actionBtn} accessibilityRole="button">
              <Text style={styles.actionTextDelete}>🗑️ Excluir</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const ReviewCard = memo(ReviewCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  cardSelf: {
    borderColor: 'rgba(255,107,74,0.4)',
    backgroundColor: 'rgba(255,107,74,0.04)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.surfaceHigh,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelf: {
    borderColor: Brand.accent,
    backgroundColor: 'rgba(255,107,74,0.15)',
  },
  avatarText: {
    color: Brand.text,
    fontSize: 14,
    fontWeight: '800',
  },
  authorName: {
    color: Brand.text,
    fontSize: 15,
    fontWeight: '700',
    maxWidth: 140,
  },
  selfBadge: {
    backgroundColor: 'rgba(255,107,74,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selfBadgeText: {
    color: Brand.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  date: {
    color: Brand.textMuted,
    fontSize: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  ratingStar: {
    fontSize: 13,
  },
  ratingNumber: {
    color: Brand.text,
    fontSize: 14,
    fontWeight: '900',
  },
  tierDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  comment: {
    color: Brand.text,
    fontSize: 15,
    lineHeight: 22,
  },
  photoWrap: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Brand.surfaceHigh,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(11,11,18,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  photoHint: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  actionBtn: {
    paddingVertical: 4,
  },
  actionTextEdit: {
    color: Brand.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  actionTextDelete: {
    color: Brand.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
