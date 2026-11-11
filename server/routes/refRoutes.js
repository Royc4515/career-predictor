const express = require('express');

/**
 * GET /api/ref/:token - the uploaded reference photo, for the image model to
 * fetch while it renders a personal portrait. Public by necessity (the model
 * fetches it), protected by a 128-bit random token that expires within
 * minutes and after a few fetches (services/image/referencePhotos.js).
 */
function createRefRouter(refs) {
  const router = express.Router();
  router.get('/api/ref/:token', (req, res) => {
    const photo = refs.take(req.params.token);
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, noimageindex');
    if (!photo) return res.status(404).send('not found');
    res.set('Content-Type', photo.mimeType);
    return res.send(photo.buffer);
  });
  return router;
}

module.exports = { createRefRouter };
