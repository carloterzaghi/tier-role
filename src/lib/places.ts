import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type Place = {
  id: string;
  name: string;
  description: string;
  address: string;
  coverUrl: string | null;
  coverThumbUrl: string | null;
  /** ids das tags (= nome em minúsculas) */
  tags: string[];
  createdBy: string;
  createdAt: number;
  avgRating: number;
  reviewCount: number;
  /** Lista de UIDs dos usuários que votaram para deletar este local */
  deleteVotes?: string[];
  /** Coordenadas de geolocalização opcionais */
  latitude?: number | null;
  longitude?: number | null;
};

export type PlacesPage = {
  items: Place[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

export type PlacesFilter = {
  search: string;
  tagId: string | null;
  cursor: QueryDocumentSnapshot<DocumentData> | null;
};

export const PAGE_SIZE = 50;
/** Filtro só por tag não pagina (evita índice composto); traz até este limite. */
const TAG_ONLY_LIMIT = 100;

function toPlace(doc: DocumentSnapshot<DocumentData>): Place {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    name: d.name ?? '',
    description: d.description ?? '',
    address: d.address ?? '',
    coverUrl: d.coverUrl ?? null,
    coverThumbUrl: d.coverThumbUrl ?? d.coverUrl ?? null,
    tags: Array.isArray(d.tags) ? d.tags : [],
    createdBy: d.createdBy ?? '',
    createdAt: d.createdAt?.toMillis?.() ?? 0,
    avgRating: typeof d.avgRating === 'number' ? d.avgRating : 0,
    reviewCount: typeof d.reviewCount === 'number' ? d.reviewCount : 0,
    deleteVotes: Array.isArray(d.deleteVotes) ? d.deleteVotes : [],
    latitude: typeof d.latitude === 'number' ? d.latitude : null,
    longitude: typeof d.longitude === 'number' ? d.longitude : null,
  };
}

/**
 * Busca locais na nuvem, sem exigir índices compostos no Firestore:
 * - busca por nome: prefixo em `nameLower` (a tag, se houver, é filtrada no app);
 * - só tag: `array-contains`, ordenado no app por data;
 * - sem filtros: mais recentes primeiro, paginado.
 */
export async function fetchPlaces({ search, tagId, cursor }: PlacesFilter): Promise<PlacesPage> {
  const col = collection(db, 'places');
  const term = search.trim().toLowerCase();

  if (!term && tagId) {
    const snap = await getDocs(
      query(col, where('tags', 'array-contains', tagId), limit(TAG_ONLY_LIMIT)),
    );
    const items = snap.docs.map(toPlace).sort((a, b) => b.createdAt - a.createdAt);
    return { items, cursor: null, hasMore: false };
  }

  const constraints: QueryConstraint[] = term
    ? [
        where('nameLower', '>=', term),
        where('nameLower', '<=', term + '\uf8ff'),
        orderBy('nameLower'),
      ]
    : [orderBy('createdAt', 'desc')];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(PAGE_SIZE));

  const snap = await getDocs(query(col, ...constraints));
  let items = snap.docs.map(toPlace);
  if (tagId) items = items.filter((p) => p.tags.includes(tagId));

  return {
    items,
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

export type Tag = { id: string; name: string };

/** Todas as tags criadas pelos usuários, em ordem alfabética. */
export async function fetchTags(): Promise<Tag[]> {
  const snap = await getDocs(query(collection(db, 'tags'), orderBy('name'), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name ?? d.id }));
}

/** Busca os detalhes de um local específico pelo seu ID. */
export async function fetchPlaceById(id: string): Promise<Place | null> {
  const snap = await getDoc(doc(db, 'places', id));
  if (!snap.exists()) return null;
  return toPlace(snap);
}
