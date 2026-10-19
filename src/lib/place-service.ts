import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { deleteObject, ref as storageRef } from 'firebase/storage';

import { db, storage } from '@/lib/firebase';
import { compressImage, IMAGE_EXT, IMAGE_MIME } from '@/lib/image';
import { uploadImage } from '@/lib/storage';

export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 24;

/** Padroniza a tag: minúsculas, sem #, espaços viram "-" e sem "/". Também é o id do documento. */
export function normalizeTag(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_TAG_LENGTH);
}

export type NewPlaceInput = {
  userId: string;
  name: string;
  address: string;
  description: string;
  /** ids de tags já normalizados */
  tags: string[];
  photo: { uri: string; width: number } | null;
  /** Coordenadas opcionais de geolocalização */
  coordinates?: { latitude: number; longitude: number } | null;
};

/** Executa uma etapa e, se falhar, anexa o nome da etapa ao erro (facilita achar a causa). */
async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.error(`[createPlace] falhou em "${label}":`, err.code, err.message, e);
    throw new Error(`${label}: ${err.code ?? err.message ?? 'erro desconhecido'}`);
  }
}

/** Cria o local na nuvem: foto (comprimida) no Storage, tags novas e o documento do local. */
export async function createPlace(input: NewPlaceInput) {
  const placeRef = doc(collection(db, 'places'));
  const base = `photos/${input.userId}/places/${placeRef.id}`;

  let coverUrl: string | null = null;
  let coverThumbUrl: string | null = null;
  if (input.photo) {
    const photo = input.photo;
    const { full, thumb } = await step('compressão da foto', () =>
      compressImage(photo.uri, photo.width),
    );
    [coverUrl, coverThumbUrl] = await step('upload da foto', () =>
      Promise.all([
        uploadImage(`${base}/cover.${IMAGE_EXT}`, full.uri, IMAGE_MIME),
        uploadImage(`${base}/thumb.${IMAGE_EXT}`, thumb.uri, IMAGE_MIME),
      ]),
    );
  }

  // As regras só permitem CRIAR tags (não editar), então só gravamos as que ainda não existem.
  await Promise.all(
    input.tags.map(async (tag) => {
      const tagRef = doc(db, 'tags', tag);
      try {
        if (!(await getDoc(tagRef)).exists()) {
          await setDoc(tagRef, { name: tag, createdBy: input.userId, createdAt: serverTimestamp() });
        }
      } catch {
        // Corrida: outro usuário criou a mesma tag agora; tudo bem.
      }
    }),
  );

  const name = input.name.trim();
  await step('gravação do local no Firestore', () =>
    setDoc(placeRef, {
      name,
      nameLower: name.toLowerCase(),
      address: input.address.trim(),
      description: input.description.trim(),
      coverUrl,
      coverThumbUrl,
      tags: input.tags,
      createdBy: input.userId,
      createdAt: serverTimestamp(),
      ratingSum: 0,
      reviewCount: 0,
      avgRating: 0,
      deleteVotes: [],
      latitude: input.coordinates?.latitude ?? null,
      longitude: input.coordinates?.longitude ?? null,
    }),
  );

  return placeRef.id;
}

/**
 * Retorna o número total de usuários registrados no app.
 */
export async function fetchTotalUsersCount(): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, 'users'));
    return snap.data().count;
  } catch (e) {
    console.warn('[fetchTotalUsersCount] fallback via getDocs:', e);
    const snap = await getDocs(collection(db, 'users'));
    return snap.size;
  }
}

/**
 * Calcula a quantidade mínima de votos para deletar o local:
 * "mais que a metade dos usuários".
 * Exemplo:
 * - 1 usuário -> metade é 0.5 -> > 0.5 é 1 voto
 * - 2 usuários -> metade é 1.0 -> > 1.0 são 2 votos
 * - 3 usuários -> metade é 1.5 -> > 1.5 são 2 votos
 * - 4 usuários -> metade é 2.0 -> > 2.0 são 3 votos
 */
export function getRequiredDeleteVotes(totalUsers: number): number {
  if (totalUsers <= 0) return 1;
  return Math.floor(totalUsers / 2) + 1;
}

export type VoteDeleteResult = {
  deleted: boolean;
  hasVoted: boolean;
  votesCount: number;
  totalUsers: number;
  requiredVotes: number;
};

/**
 * Registra ou retira o voto de exclusão do usuário.
 * Caso os votos ultrapassem 50% dos usuários cadastrados no app,
 * o local é permanentemente deletado com limpeza de avaliações, fotos e tags órfãs.
 */
export async function voteToDeletePlace(
  placeId: string,
  userId: string,
): Promise<VoteDeleteResult> {
  const totalCount = await fetchTotalUsersCount();
  const totalUsers = Math.max(1, totalCount);
  const requiredVotes = getRequiredDeleteVotes(totalUsers);

  const placeRef = doc(db, 'places', placeId);
  let willDelete = false;
  let hasVoted = false;
  let finalVotesCount = 0;
  let deletedCreatorId = '';
  let deletedTags: string[] = [];

  await runTransaction(db, async (transaction) => {
    const placeSnap = await transaction.get(placeRef);
    if (!placeSnap.exists()) {
      throw new Error('Este local não existe mais.');
    }

    const placeData = placeSnap.data();
    const currentVotes: string[] = Array.isArray(placeData.deleteVotes)
      ? placeData.deleteVotes
      : [];
    const alreadyVoted = currentVotes.includes(userId);

    let nextVotes: string[];
    if (alreadyVoted) {
      nextVotes = currentVotes.filter((id) => id !== userId);
      hasVoted = false;
    } else {
      nextVotes = [...currentVotes, userId];
      hasVoted = true;
    }

    finalVotesCount = nextVotes.length;

    if (finalVotesCount >= requiredVotes) {
      willDelete = true;
      deletedCreatorId = placeData.createdBy ?? '';
      deletedTags = Array.isArray(placeData.tags) ? placeData.tags : [];
      transaction.delete(placeRef);
    } else {
      transaction.update(placeRef, { deleteVotes: nextVotes });
    }
  });

  if (willDelete) {
    // 1. Exclui avaliações da subcoleção e suas fotos no Storage
    try {
      const reviewsCol = collection(db, 'places', placeId, 'reviews');
      const reviewsSnap = await getDocs(reviewsCol);
      if (!reviewsSnap.empty) {
        const batch = writeBatch(db);
        const reviewPhotoDeletions: Promise<unknown>[] = [];

        reviewsSnap.docs.forEach((reviewDoc) => {
          const rData = reviewDoc.data();
          if (rData.photoUrl) {
            reviewPhotoDeletions.push(deleteObject(storageRef(storage, rData.photoUrl)).catch(() => {}));
          }
          if (rData.thumbUrl) {
            reviewPhotoDeletions.push(deleteObject(storageRef(storage, rData.thumbUrl)).catch(() => {}));
          }
          batch.delete(reviewDoc.ref);
        });

        await Promise.all([batch.commit(), Promise.allSettled(reviewPhotoDeletions)]);
      }
    } catch (e) {
      console.warn('[voteToDeletePlace] erro ao apagar subcoleção de reviews:', e);
    }

    // 2. Limpa tags órfãs imediatamente
    if (deletedTags.length > 0) {
      await cleanupOrphanTags(deletedTags);
    }

    // 3. Remove fotos de capa e miniatura do local no Storage
    if (deletedCreatorId) {
      try {
        const base = `photos/${deletedCreatorId}/places/${placeId}`;
        await Promise.allSettled([
          deleteObject(storageRef(storage, `${base}/cover.${IMAGE_EXT}`)),
          deleteObject(storageRef(storage, `${base}/thumb.${IMAGE_EXT}`)),
        ]);
      } catch {
        // Silencioso se fotos já não existiam
      }
    }
  }

  return {
    deleted: willDelete,
    hasVoted,
    votesCount: finalVotesCount,
    totalUsers,
    requiredVotes,
  };
}

/**
 * Verifica uma lista de tags e remove do Firestore qualquer uma que não esteja associada
 * a nenhum local restante no banco de dados.
 */
export async function cleanupOrphanTags(tagsToCheck: string[]) {
  const uniqueTags = Array.from(new Set(tagsToCheck.filter(Boolean)));
  await Promise.all(
    uniqueTags.map(async (tag) => {
      const q = query(
        collection(db, 'places'),
        where('tags', 'array-contains', tag),
        limit(1),
      );
      const snap = await getDocs(q);
      // Se nenhum local restante possui mais esta tag, remove o documento da tag
      if (snap.empty) {
        try {
          await deleteDoc(doc(db, 'tags', tag));
        } catch (e) {
          console.warn(`[cleanupOrphanTags] Falha ao deletar tag órfã "${tag}":`, e);
        }
      }
    }),
  );
}

/**
 * Exclui o local diretamente, suas avaliações internas
 * e limpa instantaneamente quaisquer tags que tenham ficado órfãs.
 */
export async function deletePlace(placeId: string, userId: string): Promise<void> {
  const placeRef = doc(db, 'places', placeId);
  const placeSnap = await getDoc(placeRef);

  if (!placeSnap.exists()) return;

  const placeData = placeSnap.data();
  const tags: string[] = Array.isArray(placeData.tags) ? placeData.tags : [];

  // Exclui as avaliações da subcoleção, suas fotos e o documento do local
  const reviewsCol = collection(db, 'places', placeId, 'reviews');
  const reviewsSnap = await getDocs(reviewsCol);

  const batch = writeBatch(db);
  const reviewPhotoDeletions: Promise<unknown>[] = [];

  reviewsSnap.docs.forEach((reviewDoc) => {
    const rData = reviewDoc.data();
    if (rData.photoUrl) {
      reviewPhotoDeletions.push(deleteObject(storageRef(storage, rData.photoUrl)).catch(() => {}));
    }
    if (rData.thumbUrl) {
      reviewPhotoDeletions.push(deleteObject(storageRef(storage, rData.thumbUrl)).catch(() => {}));
    }
    batch.delete(reviewDoc.ref);
  });
  batch.delete(placeRef);
  await Promise.all([batch.commit(), Promise.allSettled(reviewPhotoDeletions)]);

  // Imediatamente verifica e remove qualquer tag que ficou sem nenhum local associado
  if (tags.length > 0) {
    await cleanupOrphanTags(tags);
  }

  // Limpa as fotos do local no Storage em segundo plano (silencioso)
  try {
    const base = `photos/${userId}/places/${placeId}`;
    await Promise.allSettled([
      deleteObject(storageRef(storage, `${base}/cover.${IMAGE_EXT}`)),
      deleteObject(storageRef(storage, `${base}/thumb.${IMAGE_EXT}`)),
    ]);
  } catch {
    // Foto já não existia ou falhou silenciosamente
  }
}

/**
 * Varre todas as tags do banco e remove qualquer uma que não esteja associada a nenhum local.
 */
export async function pruneAllOrphanTags(): Promise<void> {
  const snap = await getDocs(collection(db, 'tags'));
  const tagIds = snap.docs.map((d) => d.id);
  if (tagIds.length > 0) {
    await cleanupOrphanTags(tagIds);
  }
}

