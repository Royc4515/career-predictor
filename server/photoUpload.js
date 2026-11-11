// Checks and normalises an uploaded selfie before it goes anywhere.
//
// - The type is read from the bytes (sharp's decoder), never trusted from the
//   Content-Type header or a file name.
// - The output is a fresh JPEG: EXIF orientation applied, then all metadata
//   (GPS position, device, timestamps) dropped, because sharp writes none
//   unless asked. A phone photo can carry its owner's home address.
// - Downscaled to 1024 px on the long edge: plenty for a face reference,
//   and a smaller file for the model to fetch.

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MIN_SIDE = 256;
const MAX_SIDE = 1024;
const ACCEPTED = new Set(['jpeg', 'png', 'webp']);

class PhotoError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'PhotoError';
    this.status = status;
  }
}

async function normalizePhoto(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new PhotoError(400, 'No photo was received. Choose a photo and try again.');
  }
  if (buffer.length > MAX_UPLOAD_BYTES) throw new PhotoError(413, 'That photo is too large. Try one under 8 MB.');

  const sharp = require('sharp');
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new PhotoError(415, 'That file is not a photo we can read. Use a JPEG, PNG or WebP.');
  }
  if (!ACCEPTED.has(meta.format)) {
    throw new PhotoError(415, 'That file is not a photo we can read. Use a JPEG, PNG or WebP.');
  }
  // Orientation 5-8 swaps width and height once applied.
  const rotated = meta.orientation >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (!width || !height || Math.min(width, height) < MIN_SIDE) {
    throw new PhotoError(422, 'That photo is too small. Use one at least 256 pixels on each side.');
  }

  const out = await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return { buffer: out, mimeType: 'image/jpeg' };
}

module.exports = { normalizePhoto, PhotoError, MAX_UPLOAD_BYTES };
