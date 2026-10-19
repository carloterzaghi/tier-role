import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { deleteObject, ref as storageRef } from 'firebase/storage';

import { db, storage } from '@/lib/firebase';
import { compressImage, IMAGE_EXT, IMAGE_MIME } from '@/lib/image';
import { uploadImage } from '@/lib/storage';

export type Review = {
  id: string; // uid do autor
  authorId: string;
  authorName: string;
  rating: number; // 0.0 a 10.0
  comment: string;
  photoUrl: string | null;
  thumbUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

export type TierRank = 'S' | 'A' | 'B' | 'C' | 'D';

export function getTier(rating: number): { rank: TierRank; label: string; color: string; bg: string } {
  if (rating >= 9.0) return { rank: 'S', label: 'Perfeito', color: '#C084FC', bg: 'rgba(192,132,252,0.16)' };
  if (rating >= 8.0) return { rank: 'A', label: 'Excelente', color: '#34D399', bg: 'rgba(52,211,153,0.16)' };
  if (rating >= 7.0) return { rank: 'B', label: 'Muito Bom', color: '#60A5FA', bg: 'rgba(96,165,250,0.16)' };
  if (rating >= 5.0) return { rank: 'C', label: 'Regular', color: '#FBBF24', bg: 'rgba(251,191,36,0.16)' };
  return { rank: 'D', label: 'Fraco', color: '#FF5470', bg: 'rgba(255,84,112,0.16)' };
}

function toReview(docSnap: QueryDocumentSnapshot<DocumentData>): Review {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    authorId: d.authorId ?? docSnap.id,
    authorName: d.authorName ?? 'Avaliador',
    rating: typeof d.rating === 'number' ? d.rating : 0,
    comment: d.comment ?? '',
    photoUrl: d.photoUrl ?? null,
    thumbUrl: d.thumbUrl ?? d.photoUrl ?? null,
    createdAt: d.createdAt?.toMillis?.() ?? 0,
    updatedAt: d.updatedAt?.toMillis?.() ?? d.createdAt?.toMillis?.() ?? 0,
  };
}

/** Busca todas as avaliações de um local, ordenadas da mais recente para a mais antiga. */
export async function fetchPlaceReviews(placeId: string): Promise<Review[]> {
  const col = collection(db, 'places', placeId, 'reviews');
  const snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
  return snap.docs.map(toReview);
}

/** Busca a avaliação específica de um usuário em um local. */
export async function fetchUserReview(placeId: string, userId: string): Promise<Review | null> {
  const ref = doc(db, 'places', placeId, 'reviews', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    authorId: d.authorId ?? snap.id,
    authorName: d.authorName ?? 'Avaliador',
    rating: typeof d.rating === 'number' ? d.rating : 0,
    comment: d.comment ?? '',
    photoUrl: d.photoUrl ?? null,
    thumbUrl: d.thumbUrl ?? d.photoUrl ?? null,
    createdAt: d.createdAt?.toMillis?.() ?? 0,
    updatedAt: d.updatedAt?.toMillis?.() ?? d.createdAt?.toMillis?.() ?? 0,
  };
}

export type SaveReviewInput = {
  placeId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  newPhoto?: { uri: string; width: number } | null;
  removePhoto?: boolean;
  existingPhotoUrl?: string | null;
  existingThumbUrl?: string | null;
};

/**
 * Cria ou edita uma avaliação de um local via Firestore Transaction.
 * Atualiza atomicamente os agregados (ratingSum, reviewCount, avgRating) do local.
 */
export async function saveReview(input: SaveReviewInput): Promise<void> {
  const placeRef = doc(db, 'places', input.placeId);
  const reviewRef = doc(db, 'places', input.placeId, 'reviews', input.userId);

  let finalPhotoUrl: string | null = input.existingPhotoUrl ?? null;
  let finalThumbUrl: string | null = input.existingThumbUrl ?? null;

  if (input.removePhoto) {
    finalPhotoUrl = null;
    finalThumbUrl = null;
  }

  // Upload da foto (se uma nova foi selecionada)
  if (input.newPhoto) {
    const { full, thumb } = await compressImage(input.newPhoto.uri, input.newPhoto.width);
    const basePath = `photos/${input.userId}/places/${input.placeId}/reviews/${input.userId}`;
    const timestamp = Date.now();
    const [photoUrl, thumbUrl] = await Promise.all([
      uploadImage(`${basePath}/photo_${timestamp}.${IMAGE_EXT}`, full.uri, IMAGE_MIME),
      uploadImage(`${basePath}/thumb_${timestamp}.${IMAGE_EXT}`, thumb.uri, IMAGE_MIME),
    ]);
    finalPhotoUrl = photoUrl;
    finalThumbUrl = thumbUrl;
  }

  const roundedRating = Number(input.rating.toFixed(1));

  await runTransaction(db, async (tx) => {
    const placeSnap = await tx.get(placeRef);
    if (!placeSnap.exists()) {
      throw new Error('Local não encontrado');
    }
    const placeData = placeSnap.data();

    const reviewSnap = await tx.get(reviewRef);
    const isEditing = reviewSnap.exists();

    let ratingSum = placeData.ratingSum ?? 0;
    let reviewCount = placeData.reviewCount ?? 0;

    if (isEditing) {
      const oldRating = reviewSnap.data()?.rating ?? 0;
      ratingSum = Math.max(0, ratingSum - oldRating + roundedRating);
    } else {
      ratingSum += roundedRating;
      reviewCount += 1;
    }

    const avgRating = reviewCount > 0 ? Number((ratingSum / reviewCount).toFixed(2)) : 0;

    tx.set(
      reviewRef,
      {
        authorId: input.userId,
        authorName: input.authorName.trim() || 'Avaliador',
        rating: roundedRating,
        comment: input.comment.trim(),
        photoUrl: finalPhotoUrl,
        thumbUrl: finalThumbUrl,
        updatedAt: serverTimestamp(),
        ...(isEditing ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    );

    tx.update(placeRef, {
      ratingSum,
      reviewCount,
      avgRating,
    });
  });
}

/**
 * Exclui a avaliação do usuário, remove sua foto do Storage e recalcula a média do local atomicamente.
 */
export async function deleteReview(placeId: string, userId: string): Promise<void> {
  const placeRef = doc(db, 'places', placeId);
  const reviewRef = doc(db, 'places', placeId, 'reviews', userId);

  let photoToDelete: string | null = null;
  let thumbToDelete: string | null = null;

  await runTransaction(db, async (tx) => {
    const placeSnap = await tx.get(placeRef);
    const reviewSnap = await tx.get(reviewRef);

    if (!reviewSnap.exists()) return;

    const rData = reviewSnap.data();
    photoToDelete = rData?.photoUrl ?? null;
    thumbToDelete = rData?.thumbUrl ?? null;

    const placeData = placeSnap.exists() ? placeSnap.data() : {};
    const oldRating = rData?.rating ?? 0;

    const reviewCount = Math.max(0, (placeData.reviewCount ?? 1) - 1);
    const ratingSum = Math.max(0, (placeData.ratingSum ?? 0) - oldRating);
    const avgRating = reviewCount > 0 ? Number((ratingSum / reviewCount).toFixed(2)) : 0;

    tx.delete(reviewRef);

    if (placeSnap.exists()) {
      tx.update(placeRef, {
        ratingSum,
        reviewCount,
        avgRating,
      });
    }
  });

  if (photoToDelete || thumbToDelete) {
    try {
      await Promise.allSettled([
        photoToDelete ? deleteObject(storageRef(storage, photoToDelete)) : Promise.resolve(),
        thumbToDelete ? deleteObject(storageRef(storage, thumbToDelete)) : Promise.resolve(),
      ]);
    } catch {
      // Silencioso se fotos já foram excluídas
    }
  }
}
