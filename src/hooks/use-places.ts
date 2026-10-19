import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from '@tanstack/react-query';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

import { fetchPlaces, fetchTags, type PlacesPage } from '@/lib/places';

type Cursor = QueryDocumentSnapshot<DocumentData> | null;

export function usePlaces(search: string, tagId: string | null) {
  return useInfiniteQuery<PlacesPage, Error, InfiniteData<PlacesPage, Cursor>, unknown[], Cursor>({
    queryKey: ['places', search.trim().toLowerCase(), tagId],
    initialPageParam: null,
    queryFn: ({ pageParam }) => fetchPlaces({ search, tagId, cursor: pageParam }),
    getNextPageParam: (last) => (last.hasMore ? last.cursor : undefined),
  });
}

export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: fetchTags, staleTime: 5 * 60 * 1000 });
}
