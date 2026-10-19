import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

const FULL_MAX = 1600;
const FULL_QUALITY = 0.8;
const THUMB_MAX = 400;
const THUMB_QUALITY = 0.7;

/**
 * WebP onde há suporte para gravar. No iOS o encoder de WebP não é garantido,
 * então usamos JPEG (qualidade 0.8, ainda bem menor que o original).
 */
const FORMAT = Platform.OS === 'ios' ? SaveFormat.JPEG : SaveFormat.WEBP;
export const IMAGE_MIME = FORMAT === SaveFormat.JPEG ? 'image/jpeg' : 'image/webp';
export const IMAGE_EXT = FORMAT === SaveFormat.JPEG ? 'jpg' : 'webp';

export type CompressedImage = { uri: string; width: number; height: number };

async function render(
  uri: string,
  sourceWidth: number,
  max: number,
  quality: number,
): Promise<CompressedImage> {
  // Só reduz; nunca amplia imagens menores que o limite.
  const actions = sourceWidth > max ? [{ resize: { width: max } }] : [];
  const result = await manipulateAsync(uri, actions, {
    format: FORMAT,
    compress: quality,
  });
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/** Gera versão completa (até 1600px) e miniatura (400px). */
export async function compressImage(uri: string, sourceWidth: number) {
  const [full, thumb] = await Promise.all([
    render(uri, sourceWidth, FULL_MAX, FULL_QUALITY),
    render(uri, sourceWidth, THUMB_MAX, THUMB_QUALITY),
  ]);
  if (!full.uri || !thumb.uri) throw new Error('compressão não gerou arquivos da imagem');
  return { full, thumb };
}
