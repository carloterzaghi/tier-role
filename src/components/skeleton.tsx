import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { Brand } from '@/constants/brand';

type SkeletonBoxProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: object;
};

/**
 * Caixa animada com efeito pulsante (shimmer/breathing) nativo a 60fps.
 */
export function SkeletonBox({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const [opacity] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Brand.surfaceHigh,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton que espelha exatamente a estrutura e altura do PlaceCard na Home.
 */
export function PlaceCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBox height={150} borderRadius={0} />
      <View style={styles.cardBody}>
        <SkeletonBox width="65%" height={22} borderRadius={6} />
        <SkeletonBox width="45%" height={14} borderRadius={4} style={{ marginTop: 4 }} />
        <View style={styles.cardFooter}>
          <View style={styles.tagsRow}>
            <SkeletonBox width={64} height={22} borderRadius={999} />
            <SkeletonBox width={72} height={22} borderRadius={999} />
          </View>
          <SkeletonBox width={78} height={14} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton para a tela de detalhes do local.
 */
export function PlaceDetailSkeleton() {
  return (
    <View style={styles.detailContainer}>
      {/* Capa */}
      <SkeletonBox height={260} borderRadius={0} />

      {/* Conteúdo */}
      <View style={styles.detailBody}>
        {/* Título e Endereço */}
        <SkeletonBox width="70%" height={32} borderRadius={8} />
        <SkeletonBox width="50%" height={16} borderRadius={4} />

        {/* Tags */}
        <View style={styles.tagsRow}>
          <SkeletonBox width={80} height={26} borderRadius={999} />
          <SkeletonBox width={68} height={26} borderRadius={999} />
          <SkeletonBox width={92} height={26} borderRadius={999} />
        </View>

        {/* Hero Card do Score */}
        <View style={styles.heroBox}>
          <View style={{ gap: 8 }}>
            <SkeletonBox width={120} height={36} borderRadius={8} />
            <SkeletonBox width={140} height={14} borderRadius={4} />
          </View>
          <SkeletonBox width={90} height={50} borderRadius={12} />
        </View>

        {/* Botão de Avaliar */}
        <SkeletonBox width="100%" height={54} borderRadius={16} style={{ marginTop: 4 }} />

        {/* Seção de avaliações */}
        <View style={{ gap: 12, marginTop: 12 }}>
          <SkeletonBox width={180} height={22} borderRadius={6} />
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton para um card individual de avaliação.
 */
export function ReviewCardSkeleton() {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SkeletonBox width={38} height={38} borderRadius={19} />
          <View style={{ gap: 6 }}>
            <SkeletonBox width={110} height={14} borderRadius={4} />
            <SkeletonBox width={60} height={11} borderRadius={4} />
          </View>
        </View>
        <SkeletonBox width={80} height={26} borderRadius={999} />
      </View>
      <SkeletonBox width="100%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
      <SkeletonBox width="80%" height={14} borderRadius={4} />
    </View>
  );
}

/**
 * Skeleton para o formulário modal de avaliação.
 */
export function ReviewFormSkeleton() {
  return (
    <View style={styles.formContainer}>
      {/* Header */}
      <View style={styles.formHeader}>
        <SkeletonBox width={140} height={24} borderRadius={6} />
        <SkeletonBox width={64} height={18} borderRadius={6} />
      </View>
      {/* Seletor de nota */}
      <View style={styles.formBody}>
        <SkeletonBox width={120} height={14} borderRadius={4} />
        <SkeletonBox width="100%" height={110} borderRadius={20} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonBox width="23%" height={44} borderRadius={12} />
          <SkeletonBox width="23%" height={44} borderRadius={12} />
          <SkeletonBox width="23%" height={44} borderRadius={12} />
          <SkeletonBox width="23%" height={44} borderRadius={12} />
        </View>
        {/* Comentário */}
        <SkeletonBox width={140} height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <SkeletonBox width="100%" height={100} borderRadius={14} />
        {/* Foto */}
        <SkeletonBox width={160} height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <SkeletonBox width="100%" height={120} borderRadius={16} />
        {/* Botão */}
        <SkeletonBox width="100%" height={54} borderRadius={16} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    overflow: 'hidden',
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  detailBody: {
    padding: 20,
    marginTop: -20,
    gap: 16,
  },
  heroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    marginTop: 6,
  },
  reviewCard: {
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formContainer: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  formBody: {
    padding: 20,
    gap: 12,
  },
});
