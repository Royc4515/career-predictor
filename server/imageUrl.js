// Absolute URL for a generated image. In dev the client and API live on
// different origins, so a relative path would resolve against the frontend
// host and 404. SERVER_URL is the API origin; in production both origins
// match, so the prefix is harmless.
function imageUrlFor(imageId) {
  const base = (process.env.SERVER_URL || '').replace(/\/$/, '');
  return `${base}/api/image/${imageId}`;
}

module.exports = { imageUrlFor };
