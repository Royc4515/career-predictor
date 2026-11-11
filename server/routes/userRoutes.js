const express = require('express');
const {
  saveOnboarding,
  getOnboardingByUserId,
  setPersonalPortrait,
  updatePersonalStatus,
  clearPersonalPortrait,
  updateImageId,
  getCovers,
  deleteCover,
} = require('../db');
const { getImageService, getPersonalPortraitService } = require('../services/image/instance');
const { normalizePhoto, PhotoError, MAX_UPLOAD_BYTES } = require('../photoUpload');
const { SlidingWindowLimiter } = require('../rateLimit');
const { validateOnboardingAnswers } = require('../userData');
const { asyncRoute } = require('../asyncRoute');
const { imageUrlFor } = require('../imageUrl');
const router = express.Router();

// --- Auth guard ---
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

const { mapCareer, personalSceneFor, careerForTitle, promptFor } = require('../careers');

// --- Personal portraits (the user's own face; docs/personal-portrait.md) ---

const DAY_MS = 24 * 60 * 60 * 1000;
// Each one spends real pollen (~0.025 on MAI Image). Three tries a day is
// enough to redo a bad selfie; the site-wide cap protects the budget.
const perUserPortraits = new SlidingWindowLimiter({ limit: 3, windowMs: DAY_MS });
const siteWidePortraits = new SlidingWindowLimiter({ limit: 40, windowMs: DAY_MS });
const PERSONAL_ID_RE = /^[0-9a-f]{16}$/;

function personalImageUrl(id) {
  const base = (process.env.SERVER_URL || '').replace(/\/$/, '');
  return `${base}/api/user/portrait/image/${id}`;
}

/**
 * The personal portrait's real state. A row saying 'generating' after a
 * restart is stale (the in-memory job and the photo are gone), so the store
 * decides: bytes present means ready, otherwise failed. Persists the fix.
 */
async function personalState(row) {
  const id = row?.personal_image_id;
  if (!id) return null;
  let status = row.personal_status || 'generating';
  if (status === 'generating' && !getPersonalPortraitService().isGenerating(id)) {
    status = (await getImageService().blobStore.get(id)) ? 'ready' : 'failed';
    await updatePersonalStatus(row.user_id, id, status);
  }
  return { id, status };
}

/**
 * Whether this result can get a personal portrait, and if not, why, so the
 * page can say so instead of hiding the option: 'off' (not configured on
 * this deployment) or 'old-issue' (a career from before the quiz redesign,
 * with no identity-neutral scene; a retake fixes it).
 */
function personalAvailability(title) {
  if (!getPersonalPortraitService().available) return { personalAvailable: false, personalBlocked: 'off' };
  if (!personalSceneFor(title)) return { personalAvailable: false, personalBlocked: 'old-issue' };
  return { personalAvailable: true, personalBlocked: null };
}

function personalView(state) {
  return state ? { status: state.status, imageUrl: personalImageUrl(state.id) } : null;
}

// Best effort: a leftover image is wasted space, not a reason to fail the
// request the user actually made.
async function deletePersonalImage(id) {
  if (!id) return;
  try {
    await getImageService().blobStore.delete(id);
  } catch (err) {
    console.error('[PORTRAIT] delete failed', id, err.message);
  }
}

// express.raw, with its own errors (too large, unreadable) answered as JSON
// instead of Express's default HTML error page.
const rawPhoto = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_UPLOAD_BYTES });
function photoBody(req, res, next) {
  rawPhoto(req, res, (err) => {
    if (!err) return next();
    const tooLarge = err.type === 'entity.too.large';
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? 'That photo is too large. Try one under 8 MB.' : 'Could not read the upload. Try another photo.',
    });
  });
}

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

      const career = mapCareer(answers);
      // A retake replaces the result, and a personal portrait belongs to the
      // result it was shot for: delete it rather than leave a private image
      // nobody can reach.
      const previous = await getOnboardingByUserId(userId);
      await deletePersonalImage(previous?.personal_image_id);
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
          evidence: career.evidence,
        }),
        imageId,
        portraitSubject: career.portraitSubject,
      });

      res.json({
        careerTitle: career.title,
        caption: career.caption,
        imageUrl: imageUrlFor(imageId),
        stats: { happiness: career.happiness, salary: career.salary, outlook: career.outlook },
        evidence: career.evidence,
        personal: null,
        ...personalAvailability(career.title),
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
      // Make sure the saved result's portrait exists. kickoff is idempotent and
      // costs one store lookup when it does, but regenerates a portrait whose
      // bytes were lost (disk wiped by a deploy before images moved to Turso)
      // or whose stopgap expired, which nothing else would ever retry. Uses
      // the career's current scene, so a result keeps up with prompt fixes;
      // the row is repointed when that changes the id.
      let imageId = row.image_id;
      const career = careerForTitle(parsed.title);
      if (career) {
        ({ id: imageId } = getImageService().kickoff({
          scenePrompt: promptFor(career, row.portrait_subject || 'surprise'),
          title: career.title,
        }));
        if (imageId !== row.image_id) await updateImageId(req.user.id, imageId);
      }
      // Prefer the image_id route; fall back to the legacy image_url for rows
      // written before the provider abstraction (Pollinations CDN links), and
      // for careers no longer in the table.
      const imageUrl = imageId ? imageUrlFor(imageId) : row.image_url;
      res.json({
        careerTitle: parsed.title,
        caption: parsed.caption || 'Your career destiny has been sealed by the algorithm.',
        imageUrl,
        stats: { happiness: parsed.happiness, salary: parsed.salary, outlook: parsed.outlook },
        // Results saved before the quiz redesign have no evidence.
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
        personal: personalView(await personalState(row)),
        ...personalAvailability(parsed.title),
      });
    },
    { label: 'GET /api/user/result', message: 'Could not load your result. Please try again.' },
  ),
);

/**
 * The shared portrait for a saved career: the career's current scene (kicked
 * off, idempotent) so an archived cover never points at a lost or outdated
 * image, or the stored id for a career that has left the table, or, for a
 * result older than image ids, its legacy image URL (as /result does).
 */
function portraitUrlFor(title, portraitSubject, storedImageId, legacyImageUrl) {
  const career = careerForTitle(title);
  if (career) {
    const { id } = getImageService().kickoff({
      scenePrompt: promptFor(career, portraitSubject || 'surprise'),
      title: career.title,
    });
    return imageUrlFor(id);
  }
  if (storedImageId) return imageUrlFor(storedImageId);
  return legacyImageUrl || null;
}

// GET /api/user/covers - "Your back issues": every cover the user has been
// given, newest first (the first is the current result). Shared portraits
// only: personal portraits are never archived.
router.get(
  '/covers',
  requireAuth,
  asyncRoute(
    async (req, res) => {
      const rows = await getCovers(req.user.id);
      const covers = rows.map((row, i) => {
        const parsed = JSON.parse(row.career_result);
        return {
          id: row.id,
          title: parsed.title,
          caption: parsed.caption || null,
          happiness: parsed.happiness ?? null,
          imageUrl: portraitUrlFor(parsed.title, row.portrait_subject, row.image_id, row.image_url),
          filedAt: row.created_at,
          current: i === 0,
        };
      });
      res.json({ covers });
    },
    { label: 'GET /api/user/covers', message: 'Could not load your back issues. Please try again.' },
  ),
);

// DELETE /api/user/covers/:id - drop one back issue from the archive. The
// current result itself stays (retake or remove that from the result page).
router.delete(
  '/covers/:id',
  requireAuth,
  asyncRoute(
    async (req, res) => {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id <= 0 || String(id) !== req.params.id) {
        return res.status(400).json({ error: 'Invalid cover id' });
      }
      const removed = await deleteCover(req.user.id, id);
      // 404 for someone else's cover too: don't confirm it exists.
      if (!removed) return res.status(404).json({ error: 'Not found' });
      res.status(204).end();
    },
    { label: 'DELETE /api/user/covers', message: 'Could not remove that back issue. Please try again.' },
  ),
);

// POST /api/user/portrait - shoot the user's own face into their cover.
// Body: the photo bytes (image/jpeg, png or webp). Header X-Portrait-Consent:
// yes, sent only after the consent screen. Answers 202 at once; the image
// route reports progress.
router.post(
  '/portrait',
  requireAuth,
  photoBody,
  asyncRoute(
    async (req, res) => {
      if (req.get('X-Portrait-Consent') !== 'yes') {
        return res.status(400).json({ error: 'Please confirm the consent statement before uploading.' });
      }
      const service = getPersonalPortraitService();
      if (!service.available) {
        return res.status(503).json({ error: 'Personal portraits are not available right now.' });
      }
      const userId = req.user.id;
      const row = await getOnboardingByUserId(userId);
      if (!row) return res.status(409).json({ error: 'Take the questionnaire first.' });
      const title = JSON.parse(row.career_result).title;
      const scene = personalSceneFor(title);
      if (!scene) {
        return res.status(409).json({ error: 'This cover is from an older issue. Retake the questionnaire to put your face on it.' });
      }

      const userKey = `user:${userId}`;
      for (const [limiter, key, message] of [
        [perUserPortraits, userKey, 'That is three shoots today. The photographer is back tomorrow.'],
        [siteWidePortraits, 'site', 'The darkroom is fully booked today. Try again tomorrow.'],
      ]) {
        if (!limiter.allows(key)) {
          res.set('Retry-After', String(Math.ceil(limiter.retryAfterMs(key) / 1000)));
          return res.status(429).json({ error: message });
        }
      }

      let photo;
      try {
        photo = await normalizePhoto(req.body);
      } catch (err) {
        if (err instanceof PhotoError) return res.status(err.status).json({ error: err.message });
        throw err;
      }

      perUserPortraits.record(userKey);
      siteWidePortraits.record('site');
      await deletePersonalImage(row.personal_image_id);

      let imageId;
      ({ id: imageId } = service.start({
        photo,
        scene,
        title,
        onDone: (status) =>
          updatePersonalStatus(userId, imageId, status).catch((err) =>
            console.error('[PORTRAIT] status update failed', err.message),
          ),
      }));
      await setPersonalPortrait(userId, { imageId, status: 'generating', consentAt: new Date().toISOString() });
      res.status(202).json({ personal: personalView({ id: imageId, status: 'generating' }) });
    },
    { label: 'POST /api/user/portrait', message: 'Could not start your portrait. Please try again.' },
  ),
);

// DELETE /api/user/portrait - remove the personal portrait; the cover goes
// back to the desk's portrait.
router.delete(
  '/portrait',
  requireAuth,
  asyncRoute(
    async (req, res) => {
      const row = await getOnboardingByUserId(req.user.id);
      await deletePersonalImage(row?.personal_image_id);
      if (row) await clearPersonalPortrait(req.user.id);
      res.status(204).end();
    },
    { label: 'DELETE /api/user/portrait', message: 'Could not remove your portrait. Please try again.' },
  ),
);

// GET/HEAD /api/user/portrait/image/:id - the personal portrait, to its owner
// only. Same contract as /api/image/:id (404 + Retry-After while generating)
// so the client's polling works unchanged; 410 when generation failed.
router.get(
  '/portrait/image/:id',
  requireAuth,
  asyncRoute(
    async (req, res) => {
      const { id } = req.params;
      if (!PERSONAL_ID_RE.test(id)) return res.status(400).send('invalid id');
      const row = await getOnboardingByUserId(req.user.id);
      // 404, not 403: don't confirm that someone else's id exists.
      if (row?.personal_image_id !== id) return res.status(404).send('not found');
      const blob = await getImageService().blobStore.get(id);
      if (blob) {
        res.set('Content-Type', blob.mimeType);
        // private: the user's own face never sits in a shared cache.
        res.set('Cache-Control', 'private, max-age=86400');
        return res.send(blob.buffer);
      }
      const state = await personalState(row);
      if (state?.status === 'failed') return res.status(410).send('failed');
      res.set('Retry-After', '8');
      res.set('Cache-Control', 'no-store');
      return res.status(404).send('generating');
    },
    { label: 'GET /api/user/portrait/image', message: 'Could not load your portrait.' },
  ),
);

module.exports = router;
