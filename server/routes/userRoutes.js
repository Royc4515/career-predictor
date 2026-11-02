const express = require('express');
const { saveOnboarding, getOnboardingByUserId } = require('../db');
const { getImageService } = require('../services/image/instance');
const { validateOnboardingAnswers } = require('../userData');
const { asyncRoute } = require('../asyncRoute');
const { imageUrlFor } = require('../imageUrl');
const router = express.Router();

// --- Auth guard ---
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

const { mapCareer } = require('../careers');

// POST /api/user/onboarding - save answers, kick off the portrait, return result
router.post(
  '/onboarding',
  requireAuth,
  // don't touch / The database is async (Turso over the network), and Express
  // 4 does not catch rejections from async handlers: before asyncRoute a
  // failed save left the request hanging. Keep every async handler wrapped.
  asyncRoute(
    async (req, res) => {
      const { answers, error } = validateOnboardingAnswers(req.body);
      if (error) return res.status(400).json({ error });
      const { strength, monday_vibe, coworker_desc, five_year_goal, desired_field } = answers;
      const userId = req.user.id;

      const career = mapCareer(strength, monday_vibe, coworker_desc, five_year_goal, desired_field);
      console.log('[ROUTE] Career mapped:', career.title);

      // kickoff() returns synchronously with the deterministic id; generation,
      // the fallback chain and the cache run in the background. The image
      // route answers 404 + Retry-After until the bytes exist.
      const { id: imageId } = getImageService().kickoff({ scenePrompt: career.prompt, title: career.title });

      await saveOnboarding({
        userId,
        strength,
        mondayVibe: monday_vibe,
        coworkerDesc: coworker_desc,
        fiveYearGoal: five_year_goal,
        desiredField: desired_field,
        careerResult: JSON.stringify({
          title: career.title,
          caption: career.caption,
          happiness: career.happiness,
          salary: career.salary,
          outlook: career.outlook,
        }),
        imageId,
      });

      res.json({
        careerTitle: career.title,
        caption: career.caption,
        imageUrl: imageUrlFor(imageId),
        stats: { happiness: career.happiness, salary: career.salary, outlook: career.outlook },
      });
    },
    { label: 'POST /api/user/onboarding', message: 'Could not save your result. Please try again.' },
  ),
);

// GET /api/user/result - the signed-in user's saved result
router.get(
  '/result',
  requireAuth,
  asyncRoute(
    async (req, res) => {
      const row = await getOnboardingByUserId(req.user.id);
      if (!row) return res.status(404).json({ error: 'No result found' });

      const parsed = JSON.parse(row.career_result);
      // Prefer the image_id route; fall back to the legacy image_url for rows
      // written before the provider abstraction (Pollinations CDN links).
      const imageUrl = row.image_id ? imageUrlFor(row.image_id) : row.image_url;
      res.json({
        careerTitle: parsed.title,
        caption: parsed.caption || 'Your career destiny has been sealed by the algorithm.',
        imageUrl,
        stats: { happiness: parsed.happiness, salary: parsed.salary, outlook: parsed.outlook },
      });
    },
    { label: 'GET /api/user/result', message: 'Could not load your result. Please try again.' },
  ),
);

module.exports = router;
