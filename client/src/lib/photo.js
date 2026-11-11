// Shrinks a chosen photo in the browser before upload: a phone camera image
// is 3-12 MB, the server keeps at most 1024 px, and a mobile connection pays
// for every byte. Decoding here also turns iPhone HEIC photos into a JPEG the
// server accepts (Safari can decode HEIC; the server's sharp build cannot).
// The server still re-checks and re-encodes everything it receives.

export const MAX_SIDE = 1024;
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** Target size that fits inside max x max, never upscaling. */
export function fitWithin(width, height, max = MAX_SIDE) {
  if (!(width > 0) || !(height > 0)) throw new Error('invalid image size');
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export class PhotoInputError extends Error {}

/** File from an <input type="file"> -> a JPEG Blob of at most 1024 px. */
export async function preparePhoto(file) {
  if (!file) throw new PhotoInputError('Choose a photo first.');
  if (file.type && !file.type.startsWith('image/')) throw new PhotoInputError('That file is not a photo.');
  if (file.size > MAX_INPUT_BYTES) throw new PhotoInputError('That photo is too large. Try one under 25 MB.');

  let bitmap;
  try {
    // from-image applies the EXIF rotation, so a portrait selfie stays upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoInputError('This browser could not open that photo. Try a JPEG or PNG.');
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  if (!blob) throw new PhotoInputError('Could not prepare that photo. Try another one.');
  return blob;
}
