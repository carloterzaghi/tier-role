import { useQuery } from '@tanstack/react-query';

import { fetchTotalUsersCount } from '@/lib/place-service';
import { fetchPlaceById } from '@/lib/places';
import { fetchPlaceReviews, fetchUserReview } from '@/lib/reviews';

/** Hook para buscar os detalhes do local (nome, endereço, média, tags). */
export function usePlaceDetail(placeId: string) {
  return useQuery({
    queryKey: ['place', placeId],
    queryFn: () => fetchPlaceById(placeId),
    enabled: !!placeId,
    staleTime: 30_000,
  });
}

/** Hook para buscar a lista de avaliações do local. */
export function usePlaceReviews(placeId: string) {
  return useQuery({
    queryKey: ['place-reviews', placeId],
    queryFn: () => fetchPlaceReviews(placeId),
    enabled: !!placeId,
    staleTime: 15_000,
  });
}

/** Hook para verificar se o usuário atual já avaliou esse local. */
export function useUserReview(placeId: string, userId?: string | null) {
  return useQuery({
    queryKey: ['my-review', placeId, userId],
    queryFn: () => (userId ? fetchUserReview(placeId, userId) : null),
    enabled: !!placeId && !!userId,
    staleTime: 15_000,
  });
}

/** Hook para buscar a contagem total de usuários do app para a votação de exclusão. */
export function useTotalUsersCount() {
  return useQuery({
    queryKey: ['total-users-count'],
    queryFn: () => fetchTotalUsersCount(),
    staleTime: 60_000,
  });
}
