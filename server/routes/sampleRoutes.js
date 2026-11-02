const express = require('express');
const { sampleCareers } = require('../careers');
const { imageUrlFor } = require('../imageUrl');

/**
 * GET /api/samples - a few real outcomes for the landing page's cover
 * specimen, each with its portrait URL.
 *
 * Public on purpose (signed-out visitors see the landing page). It cannot be
 * used to generate arbitrary images: the set is fixed, ids are content
 * hashes, kickoff() dedups in-flight work and the BlobStore short-circuits
 * anything already rendered, so repeated calls cost one cache lookup each.
 */
function createSampleRouter(imageService) {
  const router = express.Router();

  router.get('/api/samples', (req, res) => {
    try {
      const samples = sampleCareers().map((career) => {
        const { id } = imageService.kickoff({ scenePrompt: career.prompt, title: career.title });
        return { title: career.title, imageUrl: imageUrlFor(id) };
      });
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ samples });
    } catch (err) {
      console.error('[SAMPLES] failed', err);
      res.status(500).json({ error: 'Samples are unavailable right now.' });
    }
  });

  return router;
}

module.exports = { createSampleRouter };
