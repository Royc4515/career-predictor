const express = require('express');
const { saveOnboarding, getOnboardingByUserId } = require('../db');
const { getImageService } = require('../services/image/instance');
const { validateOnboardingAnswers } = require('../userData');
const { imageUrlFor } = require('../imageUrl');
const router = express.Router();

// --- Auth guard ---
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

const { mapCareer } = require('../careers');

// POST /api/user/onboarding — save answers, generate image, return result
router.post('/onboarding', requireAuth, (req, res) => {
  console.log('[ROUTE] POST /api/user/onboarding — user:', req.user.name);

  const { answers, error } = validateOnboardingAnswers(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  const { strength, monday_vibe, coworker_desc, five_year_goal, desired_field } = answers;
  const userId = req.user.id;
  console.log('[ROUTE] Answers:', answers);

  // don't touch / This handler used to be async, and Express 4 does not catch
  // rejections from async handlers, so a throw from saveOnboarding() left the
  // request hanging. Nothing in here awaits; keep it sync with this try/catch
  // so every failure gets a JSON 500 the client can show.
  try {
    handleOnboarding(res, userId, { strength, monday_vibe, coworker_desc, five_year_goal, desired_field });
  } catch (err) {
    console.error('[ROUTE] POST /api/user/onboarding failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not save your result. Please try again.' });
    }
  }
});

function handleOnboarding(res, userId, { strength, monday_vibe, coworker_desc, five_year_goal, desired_field }) {
  // Map answers → career
  const career = mapCareer(strength, monday_vibe, coworker_desc, five_year_goal, desired_field);
  console.log('[ROUTE] Career mapped:', career.title);

  // Kick off image generation in the background. kickoff() returns
  // synchronously with the deterministic id; the orchestrator's fallback
  // chain + BlobStore cache run async. The /api/image/:id route serves
  // bytes when ready and returns 404 (with Retry-After) while generating —
  // the client's existing retry-with-backoff loop drives the polling.
  const { id: imageId } = getImageService().kickoff({
    scenePrompt: career.prompt,
    title: career.title,
  });
  const imageUrl = imageUrlFor(imageId);
  console.log('[ROUTE] Image generation kicked off, id=' + imageId);

  // Save to DB
  saveOnboarding({
    userId,
    strength,
    mondayVibe: monday_vibe,
    coworkerDesc: coworker_desc,
    fiveYearGoal: five_year_goal,
    desiredField: desired_field,
    careerResult: JSON.stringify({ title: career.title, caption: career.caption, happiness: career.happiness, salary: career.salary, outlook: career.outlook }),
    imageId,
  });

  res.json({
    careerTitle: career.title,
    caption: career.caption,
    imageUrl,
    stats: {
      happiness: career.happiness,
      salary: career.salary,
      outlook: career.outlook,
    },
  });
}

// GET /api/user/result — fetch saved result for current user
router.get('/result', requireAuth, (req, res) => {
  console.log('[ROUTE] GET /api/user/result — user:', req.user.name);

  const row = getOnboardingByUserId(req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'No result found' });
  }

  const parsed = JSON.parse(row.career_result);
  // Prefer the new image_id route; fall back to legacy image_url for
  // historical rows generated before the provider abstraction landed.
  const imageUrl = row.image_id ? imageUrlFor(row.image_id) : row.image_url;
  res.json({
    careerTitle: parsed.title,
    caption: parsed.caption || 'Your career destiny has been sealed by the algorithm.',
    imageUrl,
    stats: {
      happiness: parsed.happiness,
      salary: parsed.salary,
      outlook: parsed.outlook,
    },
  });
});

module.exports = router;
