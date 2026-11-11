const express = require('express');

/**
 * GET /api/features - what this deployment can do, for the questionnaire to
 * decide which options to show before any result exists (e.g. "Use my own
 * photo" needs an image-to-image key and a public https SERVER_URL).
 * Public and cheap: booleans only, nothing about the configuration itself.
 */
function createFeatureRouter({ personalPortraits }) {
  const router = express.Router();
  router.get('/api/features', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ personalPortraits: Boolean(personalPortraits().available) });
  });
  return router;
}

module.exports = { createFeatureRouter };
