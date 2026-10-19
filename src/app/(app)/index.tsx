import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceCard } from '@/components/place-card';
import { PlacesMap } from '@/components/places-map';
import { PlaceCardSkeleton } from '@/components/skeleton';
import { TagChips } from '@/components/tag-chips';
import { APP_VERSION, Brand } from '@/constants/brand';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePlaces, useTags } from '@/hooks/use-places';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import type { Place } from '@/lib/places';

export default function Home() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState('');
  const [tagId, setTagId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const search = useDebouncedValue(searchText, 400);

  const tags = useTags();
  const places = usePlaces(search, tagId);

  const items = useMemo(() => places.data?.pages.flatMap((p) => p.items) ?? [], [places.data]);
  const mappedCount = useMemo(
    () =>
      items.filter(
        (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number',
      ).length,
    [items],
  );
  const firstName = (user?.displayName ?? user?.email ?? '').split(' ')[0];
  const filtering = search.trim().length > 0 || tagId !== null;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    return places.refetch();
  }, [places, queryClient]);

  const onEnd = useCallback(() => {
    if (places.hasNextPage && !places.isFetchingNextPage) places.fetchNextPage();
  }, [places]);

  const renderItem = useCallback(
    ({ item }: { item: Place }) => (
      <PlaceCard
        place={item}
        onPress={() =>
          router.push({
            pathname: '/place/[id]',
            params: { id: item.id },
          })
        }
      />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.helloRow}>
            <Text style={styles.hello}>Olá, {firstName} 👋</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>{APP_VERSION}</Text>
            </View>
          </View>
          <Text style={styles.title}>Onde vamos hoje?</Text>
        </View>
        <Pressable onPress={signOut} hitSlop={10} accessibilityRole="button" style={styles.logout}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar local pelo nome"
          placeholderTextColor={Brand.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchText ? (
          <Pressable onPress={() => setSearchText('')} hitSlop={10} accessibilityLabel="Limpar busca">
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Alternador de Visualização: Lista ou Mapa */}
      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => {
            haptic.selection();
            setViewMode('list');
          }}
          style={[styles.tabBtn, viewMode === 'list' && styles.tabBtnActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'list' }}>
          <Text style={[styles.tabBtnText, viewMode === 'list' && styles.tabBtnTextActive]}>
            📋 Lista ({items.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            haptic.selection();
            setViewMode('map');
          }}
          style={[styles.tabBtn, viewMode === 'map' && styles.tabBtnActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'map' }}>
          <Text style={[styles.tabBtnText, viewMode === 'map' && styles.tabBtnTextActive]}>
            🗺️ Mapa ({mappedCount})
          </Text>
        </Pressable>
      </View>

      <View style={styles.chips}>
        <TagChips
          tags={tags.data ?? []}
          selected={tagId}
          onSelect={(nextId) => {
            haptic.selection();
            setTagId(nextId);
          }}
        />
      </View>

      {places.isPending ? (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110, gap: 16 }]}
          showsVerticalScrollIndicator={false}>
          <PlaceCardSkeleton />
          <PlaceCardSkeleton />
          <PlaceCardSkeleton />
        </ScrollView>
      ) : places.isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
          <Text style={styles.emptyText}>Verifique sua conexão e tente de novo.</Text>
          <Pressable onPress={() => places.refetch()} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : viewMode === 'map' ? (
        <PlacesMap places={items} bottomInset={insets.bottom} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={onEnd}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={places.isRefetching && !places.isFetchingNextPage}
              onRefresh={refresh}
              tintColor={Brand.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{filtering ? '🕵️' : '🍽️'}</Text>
              <Text style={styles.emptyTitle}>
                {filtering ? 'Nenhum local encontrado' : 'Ainda não há locais'}
              </Text>
              <Text style={styles.emptyText}>
                {filtering
                  ? 'Tente outro nome ou outra tag.'
                  : 'Toque no + para cadastrar o primeiro lugar.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            places.isFetchingNextPage ? (
              <ActivityIndicator color={Brand.accent} style={{ marginVertical: 20 }} />
            ) : items.length > 0 ? (
              <View style={styles.listFooter}>
                <Text style={styles.listFooterText}>Tier Role · {APP_VERSION}</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Botão Flutuante Central para Alternar Rápido Lista / Mapa */}
      {!places.isPending && !places.isError && (
        <Pressable
          onPress={() => {
            haptic.selection();
            setViewMode((prev) => (prev === 'list' ? 'map' : 'list'));
          }}
          style={({ pressed }) => [
            styles.floatingSwitchBtn,
            { bottom: insets.bottom + 24 },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'list' ? 'Ver no mapa' : 'Ver em lista'}>
          <Text style={styles.floatingSwitchText}>
            {viewMode === 'list' ? '🗺️ Ver no mapa' : '📋 Ver em lista'}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => {
          haptic.medium();
          router.push('/place/new');
        }}
        accessibilityRole="button"
        accessibilityLabel="Adicionar local"
        style={({ pressed }) => [
          styles.fabWrap,
          { bottom: insets.bottom + 24 },
          pressed && { transform: [{ scale: 0.92 }] },
        ]}>
        <LinearGradient colors={Brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Text style={styles.fabPlus}>+</Text>
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  hello: { color: Brand.textMuted, fontSize: 14, fontWeight: '600' },
  title: { color: Brand.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  logout: {
    paddingHorizontal: 14,
    height: 36,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  logoutText: { color: Brand.textMuted, fontSize: 13, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: Brand.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: Brand.text, fontSize: 16, height: '100%' },
  clear: { color: Brand.textMuted, fontSize: 16, fontWeight: '700' },
  chips: { height: 38, marginVertical: 14 },
  list: { paddingHorizontal: 20, paddingTop: 4, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 32, gap: 8 },
  emptyEmoji: { fontSize: 52, marginBottom: 6 },
  emptyTitle: { color: Brand.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: Brand.textMuted, fontSize: 15, textAlign: 'center' },
  retry: { marginTop: 10, paddingHorizontal: 20, height: 44, justifyContent: 'center', borderRadius: 999, backgroundColor: Brand.surfaceHigh },
  retryText: { color: Brand.accent, fontWeight: '800' },
  fabWrap: {
    position: 'absolute',
    right: 20,
    borderRadius: 30,
    shadowColor: Brand.accent,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  fab: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  fabPlus: { color: '#fff', fontSize: 34, fontWeight: '300', marginTop: -2 },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Brand.surface,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: Brand.surfaceHigh,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 74, 0.4)',
  },
  tabBtnText: {
    color: Brand.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: Brand.text,
    fontWeight: '800',
  },
  floatingSwitchBtn: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(18, 18, 28, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  floatingSwitchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  helloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 107, 74, 0.14)',
    borderColor: 'rgba(255, 107, 74, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  versionBadgeText: {
    color: Brand.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  listFooter: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFooterText: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
