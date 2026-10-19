import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoModal } from '@/components/photo-modal';
import { ReviewCard } from '@/components/review-card';
import { PlaceDetailSkeleton } from '@/components/skeleton';
import { Brand } from '@/constants/brand';
import {
  usePlaceDetail,
  usePlaceReviews,
  useTotalUsersCount,
  useUserReview,
} from '@/hooks/use-place-detail';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { getRequiredDeleteVotes, voteToDeletePlace } from '@/lib/place-service';
import { deleteReview, getTier } from '@/lib/reviews';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Array.isArray(id) ? id[0] : id;

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const placeQuery = usePlaceDetail(placeId);
  const reviewsQuery = usePlaceReviews(placeId);
  const myReviewQuery = useUserReview(placeId, user?.uid);
  const totalUsersQuery = useTotalUsersCount();

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const place = placeQuery.data;
  const reviews = reviewsQuery.data ?? [];
  const myReview = myReviewQuery.data;
  const totalUsers = totalUsersQuery.data ?? 1;

  const deleteVotes = place?.deleteVotes ?? [];
  const votesCount = deleteVotes.length;
  const requiredVotes = getRequiredDeleteVotes(totalUsers);
  const hasUserVoted = !!user && deleteVotes.includes(user.uid);
  const voteProgressPercent = Math.min(100, Math.round((votesCount / requiredVotes) * 100));

  const isRefreshing =
    placeQuery.isRefetching || reviewsQuery.isRefetching || totalUsersQuery.isRefetching;

  const onRefresh = useCallback(async () => {
    await Promise.all([
      placeQuery.refetch(),
      reviewsQuery.refetch(),
      myReviewQuery.refetch(),
      totalUsersQuery.refetch(),
    ]);
  }, [placeQuery, reviewsQuery, myReviewQuery, totalUsersQuery]);

  function handleGoBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function handleOpenReviewModal() {
    haptic.medium();
    router.push({
      pathname: '/place/[id]/review',
      params: { id: placeId },
    });
  }

  function handleDeleteReview() {
    if (!user || !placeId) return;

    Alert.alert(
      'Excluir avaliação',
      'Tem certeza de que deseja remover sua avaliação deste local?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteReview(placeId, user.uid);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['place', placeId] }),
                queryClient.invalidateQueries({ queryKey: ['place-reviews', placeId] }),
                queryClient.invalidateQueries({ queryKey: ['my-review', placeId, user.uid] }),
                queryClient.invalidateQueries({ queryKey: ['places'] }),
              ]);
            } catch (e) {
              Alert.alert('Erro ao excluir', e instanceof Error ? e.message : 'Tente novamente.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }

  function handleVoteDelete() {
    if (!user || !place || !placeId) return;

    if (hasUserVoted) {
      Alert.alert(
        'Cancelar voto de exclusão',
        `Você já votou para deletar "${place.name}". Deseja retirar seu voto?`,
        [
          { text: 'Manter voto', style: 'cancel' },
          {
            text: 'Retirar Voto',
            style: 'default',
            onPress: async () => {
              try {
                setIsDeleting(true);
                await voteToDeletePlace(placeId, user.uid);
                haptic.selection();
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['place', placeId] }),
                  queryClient.invalidateQueries({ queryKey: ['total-users-count'] }),
                ]);
              } catch (e) {
                haptic.error();
                Alert.alert('Erro ao cancelar voto', e instanceof Error ? e.message : 'Tente novamente.');
              } finally {
                setIsDeleting(false);
              }
            },
          },
        ],
      );
      return;
    }

    const willBeDeleted = votesCount + 1 >= requiredVotes;

    Alert.alert(
      'Votação para exclusão',
      willBeDeleted
        ? `Seu voto atingirá a meta (${votesCount + 1} de ${requiredVotes} votos necessários, mais de 50% dos ${totalUsers} usuários). O local "${place.name}" será excluído permanentemente agora!`
        : `Votar para excluir "${place.name}"? São necessários ${requiredVotes} votos (mais que a metade dos ${totalUsers} usuários cadastrados) para o local ser deletado. Atualmente tem ${votesCount} votos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: willBeDeleted ? 'Confirmar e Deletar Local' : 'Votar para Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const res = await voteToDeletePlace(placeId, user.uid);
              if (res.deleted) {
                haptic.success();
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['places'] }),
                  queryClient.invalidateQueries({ queryKey: ['tags'] }),
                  queryClient.invalidateQueries({ queryKey: ['total-users-count'] }),
                ]);
                Alert.alert(
                  'Local deletado!',
                  `A maioria dos usuários (> 50%) votou pela exclusão. "${place.name}" foi permanentemente removido da comunidade.`,
                );
                router.replace('/');
              } else {
                haptic.success();
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['place', placeId] }),
                  queryClient.invalidateQueries({ queryKey: ['total-users-count'] }),
                ]);
                Alert.alert(
                  'Voto registrado!',
                  `Voto computado com sucesso! (${res.votesCount} de ${res.requiredVotes} votos necessários para exclusão).`,
                );
              }
            } catch (e) {
              haptic.error();
              Alert.alert('Erro ao votar', e instanceof Error ? e.message : 'Tente novamente.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }

  function handleOpenMaps() {
    if (!place) return;
    haptic.selection();

    if (place.latitude && place.longitude) {
      const scheme =
        Platform.select({
          ios: `maps:0,0?q=${encodeURIComponent(place.name)}@${place.latitude},${place.longitude}`,
          android: `geo:0,0?q=${place.latitude},${place.longitude}(${encodeURIComponent(place.name)})`,
        }) || `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;

      Linking.openURL(scheme).catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`,
        );
      });
    } else if (place.address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
      Linking.openURL(url);
    }
  }

  if (placeQuery.isPending) {
    return <PlaceDetailSkeleton />;
  }

  if (placeQuery.isError || !place) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>🔍</Text>
        <Text style={styles.errorTitle}>Local não encontrado</Text>
        <Text style={styles.errorSubtitle}>Ele pode ter sido removido ou o link é inválido.</Text>
        <Pressable onPress={handleGoBack} style={styles.backBtnAction} accessibilityRole="button">
          <Text style={styles.backBtnText}>Voltar para o início</Text>
        </Pressable>
      </View>
    );
  }

  const hasReviews = place.reviewCount > 0;
  const tier = getTier(place.avgRating);
  const otherReviews = reviews.filter((r) => r.authorId !== user?.uid);

  return (
    <View style={styles.root}>
      {/* Barra de Navegação Flutuante */}
      <SafeAreaView edges={['top']} style={styles.floatingNav}>
        <Pressable onPress={handleGoBack} style={styles.iconCircle} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.iconCircleText}>‹</Text>
        </Pressable>
        <Pressable
          onPress={handleVoteDelete}
          style={[
            styles.iconCircle,
            styles.deleteCircle,
            hasUserVoted && styles.deleteCircleActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel={hasUserVoted ? 'Cancelar voto de exclusão' : 'Votar para excluir local'}>
          <Text style={styles.deleteIconText}>🗳️</Text>
          {votesCount > 0 ? (
            <View style={styles.voteCountBadge}>
              <Text style={styles.voteCountBadgeText}>{votesCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Brand.accent} />
        }>
        {/* Capa */}
        <Pressable
          onPress={() => (place.coverUrl ? setSelectedPhoto(place.coverUrl) : null)}
          style={styles.coverBox}
          accessibilityRole={place.coverUrl ? 'button' : 'none'}
          accessibilityLabel="Foto de capa">
          {place.coverUrl ? (
            <Image source={{ uri: place.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={['#2A2A3F', '#15151F']} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(11,11,18,0.7)', Brand.bg]}
            style={styles.coverGradient}
          />
        </Pressable>

        {/* Informações Principais do Local */}
        <View style={styles.mainInfo}>
          <Text style={styles.placeName}>{place.name}</Text>

          {place.address || (place.latitude && place.longitude) ? (
            <Pressable
              onPress={handleOpenMaps}
              style={({ pressed }) => [styles.addressRow, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Ver endereço no mapa">
              <Text style={styles.addressIcon}>📍</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {place.address || 'Localização marcada no mapa'}
              </Text>
              <View style={styles.openMapsPill}>
                <Text style={styles.openMapsPillText}>Ver no mapa ›</Text>
              </View>
            </Pressable>
          ) : null}

          {/* Tags */}
          {place.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {place.tags.map((t) => (
                <View key={t} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Descrição */}
          {place.description ? <Text style={styles.description}>{place.description}</Text> : null}

          {/* Placar / Card Hero de Avaliação */}
          <View style={[styles.scoreHero, { borderColor: hasReviews ? tier.color : Brand.border }]}>
            <View style={styles.scoreHeroLeft}>
              <View style={styles.bigScoreRow}>
                <Text style={[styles.bigStar, { color: hasReviews ? tier.color : Brand.textMuted }]}>★</Text>
                <Text style={styles.bigScoreValue}>
                  {hasReviews ? place.avgRating.toFixed(1) : '—'}
                </Text>
                <Text style={styles.bigScoreMax}>/ 10</Text>
              </View>
              <Text style={styles.reviewCountText}>
                {hasReviews
                  ? `${place.reviewCount} ${place.reviewCount === 1 ? 'avaliação registrada' : 'avaliações registradas'}`
                  : 'Ainda sem avaliações registradas'}
              </Text>
            </View>

            <View
              style={[
                styles.tierBadgeBox,
                { backgroundColor: hasReviews ? tier.bg : Brand.surfaceHigh, borderColor: hasReviews ? tier.color : Brand.border },
              ]}>
              <Text style={[styles.tierRankText, { color: hasReviews ? tier.color : Brand.textMuted }]}>
                {hasReviews ? `TIER ${tier.rank}` : 'SEM NOTA'}
              </Text>
              <Text style={[styles.tierSubText, { color: hasReviews ? tier.color : Brand.textMuted }]}>
                {hasReviews ? tier.label : 'Novo Local'}
              </Text>
            </View>
          </View>

          {/* Botão de Avaliar ou Editar Minha Avaliação */}
          <Pressable
            onPress={handleOpenReviewModal}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            accessibilityRole="button">
            <LinearGradient
              colors={myReview ? ['#374151', '#1F2937'] : Brand.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}>
              <Text style={styles.ctaText}>
                {myReview ? '✏️ Editar minha avaliação' : '⭐ Dar minha nota e opinião'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Seção de Avaliações */}
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>
              Avaliações da Comunidade ({reviews.length})
            </Text>

            {/* Avaliação do próprio usuário em destaque */}
            {myReview ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.subSectionLabel}>Sua Avaliação:</Text>
                <ReviewCard
                  review={myReview}
                  isCurrentUser={true}
                  onEdit={handleOpenReviewModal}
                  onDelete={handleDeleteReview}
                  onPressPhoto={setSelectedPhoto}
                />
              </View>
            ) : null}

            {/* Outras Avaliações */}
            {otherReviews.length > 0 ? (
              <View style={{ gap: 12, marginTop: myReview ? 8 : 0 }}>
                {myReview ? <Text style={styles.subSectionLabel}>Outras avaliações:</Text> : null}
                {otherReviews.map((item) => (
                  <ReviewCard
                    key={item.id}
                    review={item}
                    isCurrentUser={false}
                    onPressPhoto={setSelectedPhoto}
                  />
                ))}
              </View>
            ) : null}

            {/* Estado Vazio de Avaliações */}
            {reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Text style={styles.emptyReviewsEmoji}>💬</Text>
                <Text style={styles.emptyReviewsTitle}>Nenhuma avaliação ainda</Text>
                <Text style={styles.emptyReviewsSubtitle}>
                  Experimentou esse lugar? Seja o primeiro a definir o Tier dele!
                </Text>
              </View>
            ) : null}
          </View>

          {/* Seção de Votação da Comunidade para Deletar Local */}
          <View style={styles.voteSection}>
            <View style={styles.voteHeader}>
              <View style={[styles.voteIconWrap, hasUserVoted && styles.voteIconWrapActive]}>
                <Text style={styles.voteIconEmoji}>🗳️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.voteTitle}>Votação para Deletar Local</Text>
                <Text style={styles.voteSubtitle}>
                  O local é deletado se mais da metade dos usuários votarem a favor.
                </Text>
              </View>
            </View>

            {/* Placar de Votos */}
            <View style={styles.voteScoreCard}>
              <View style={styles.voteStatsRow}>
                <View>
                  <Text style={styles.voteStatLabel}>Votos registrados</Text>
                  <Text style={styles.voteStatValue}>
                    {votesCount}{' '}
                    <Text style={styles.voteStatMuted}>/ {requiredVotes} necessários</Text>
                  </Text>
                </View>
                <View style={styles.voteTotalBadge}>
                  <Text style={styles.voteTotalBadgeText}>
                    {totalUsers} {totalUsers === 1 ? 'usuário no app' : 'usuários no app'}
                  </Text>
                </View>
              </View>

              {/* Barra de Progresso do Voto */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${voteProgressPercent}%` },
                    votesCount > 0 && { backgroundColor: Brand.danger },
                  ]}
                />
              </View>

              <Text style={styles.voteHelpText}>
                {votesCount === 0
                  ? 'Nenhum usuário votou para excluir este local ainda.'
                  : `${votesCount} de ${totalUsers} ${totalUsers === 1 ? 'usuário votou' : 'usuários votaram'} (${Math.round((votesCount / totalUsers) * 100)}% da comunidade).`}
              </Text>
            </View>

            {/* Botão de Ação do Voto */}
            <Pressable
              onPress={handleVoteDelete}
              style={({ pressed }) => [
                styles.voteActionBtn,
                hasUserVoted && styles.voteActionBtnVoted,
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
              accessibilityRole="button">
              <Text style={[styles.voteActionBtnText, hasUserVoted && styles.voteActionBtnTextVoted]}>
                {hasUserVoted
                  ? '✓ Você votou para excluir (toque para retirar voto)'
                  : '🗳️ Votar para deletar este local'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modal para ver fotos ampliadas */}
      <PhotoModal
        visible={!!selectedPhoto}
        imageUrl={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />

      {/* Loading overlay durante exclusão */}
      {isDeleting ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Brand.accent} size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },
  centerContainer: {
    flex: 1,
    backgroundColor: Brand.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  floatingNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteCircle: {
    backgroundColor: 'rgba(255, 84, 112, 0.25)',
    borderColor: 'rgba(255, 84, 112, 0.45)',
  },
  deleteIconText: {
    fontSize: 16,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(11, 11, 18, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconCircleText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
    marginTop: -2,
  },
  coverBox: {
    height: 260,
    backgroundColor: Brand.surfaceHigh,
    position: 'relative',
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  mainInfo: {
    paddingHorizontal: 20,
    marginTop: -24,
    gap: 16,
  },
  placeName: {
    color: Brand.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressIcon: {
    fontSize: 16,
  },
  addressText: {
    color: Brand.textMuted,
    fontSize: 14,
    flex: 1,
  },
  openMapsPill: {
    backgroundColor: 'rgba(255, 107, 74, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 74, 0.3)',
  },
  openMapsPillText: {
    color: Brand.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagText: {
    color: '#B7A0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    color: Brand.text,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  scoreHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 6,
  },
  scoreHeroLeft: {
    gap: 4,
  },
  bigScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bigStar: {
    fontSize: 26,
  },
  bigScoreValue: {
    color: Brand.text,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  bigScoreMax: {
    color: Brand.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
  reviewCountText: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tierBadgeBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  tierRankText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tierSubText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ctaBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  reviewsSection: {
    marginTop: 12,
    gap: 14,
  },
  sectionTitle: {
    color: Brand.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subSectionLabel: {
    color: Brand.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyReviewsEmoji: {
    fontSize: 40,
  },
  emptyReviewsTitle: {
    color: Brand.text,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyReviewsSubtitle: {
    color: Brand.textMuted,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    color: Brand.text,
    fontSize: 20,
    fontWeight: '800',
  },
  errorSubtitle: {
    color: Brand.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  backBtnAction: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: Brand.text,
    fontSize: 14,
    fontWeight: '700',
  },
  creatorSection: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  deletePlaceBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 84, 112, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 112, 0.25)',
  },
  deletePlaceText: {
    color: Brand.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  voteSection: {
    marginTop: 28,
    padding: 18,
    borderRadius: 20,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    gap: 14,
  },
  voteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voteIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 84, 112, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteIconWrapActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  voteIconEmoji: {
    fontSize: 22,
  },
  voteTitle: {
    color: Brand.text,
    fontSize: 16,
    fontWeight: '800',
  },
  voteSubtitle: {
    color: Brand.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  voteScoreCard: {
    backgroundColor: Brand.surfaceHigh,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  voteStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voteStatLabel: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  voteStatValue: {
    color: Brand.text,
    fontSize: 20,
    fontWeight: '900',
  },
  voteStatMuted: {
    color: Brand.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  voteTotalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  voteTotalBadgeText: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Brand.accent,
  },
  voteHelpText: {
    color: Brand.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  voteActionBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 84, 112, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 84, 112, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteActionBtnVoted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  voteActionBtnText: {
    color: Brand.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  voteActionBtnTextVoted: {
    color: Brand.success,
  },
  deleteCircleActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  voteCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Brand.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  voteCountBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 11, 18, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
});
