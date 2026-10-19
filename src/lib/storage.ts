import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

/**
 * Converte a URI de um arquivo local (gerado pelo expo-image-manipulator ou expo-image-picker)
 * em um Blob nativo do React Native usando XMLHttpRequest com responseType="blob".
 * Esta é a forma compatível e recomendada no React Native / Expo Go.
 */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      resolve(xhr.response as Blob);
    };
    xhr.onerror = (e) => {
      reject(new TypeError(`Falha ao ler arquivo local para Blob: ${e}`));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

/**
 * Envia uma imagem a partir de sua URI local para o Firebase Storage e devolve a URL de download.
 */
export async function uploadImage(path: string, uri: string, contentType: string): Promise<string> {
  const fileRef = ref(storage, path);
  const blob = await uriToBlob(uri);

  try {
    await uploadBytes(fileRef, blob, { contentType });
    return await getDownloadURL(fileRef);
  } catch (err: unknown) {
    const e = err as {
      code?: string;
      message?: string;
      status?: number;
      serverResponse?: string;
    };
    console.error('[uploadImage] Falha no upload:', {
      path,
      code: e.code,
      message: e.message,
      status: e.status,
      serverResponse: e.serverResponse,
    });
    throw err;
  } finally {
    // Libera a referência nativa no BlobManager do React Native
    if (typeof (blob as unknown as { close?: () => void }).close === 'function') {
      (blob as unknown as { close: () => void }).close();
    }
  }
}
