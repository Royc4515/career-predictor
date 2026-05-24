const express = require('express');

const ID_RE = /^[0-9a-f]{16}$/;

function createImageRouter(imageService) {
  const router = express.Router();

  router.get('/api/image/:id', async (req, res) => {
    const { id } = req.params;
    if (!ID_RE.test(id)) return res.status(400).send('invalid id');

    try {
      const blob = await imageService.fetchIfReady(id);
      if (!blob) {
        // Spec §6 — 404 means "still generating". Client retries on error.
        res.set('Retry-After', '8');
        return res.status(404).send('generating');
      }
      res.set('Content-Type', blob.mimeType);
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(blob.buffer);
    } catch (err) {
      console.error('[IMAGE_ROUTE] fetchIfReady failed', err);
      return res.status(500).send('image lookup failed');
    }
  });

  return router;
}

module.exports = { createImageRouter };
