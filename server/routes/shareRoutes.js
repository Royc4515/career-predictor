const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const express = require('express');
const sharp = require('sharp');
const {
  createShare,
  findLiveShare,
  findShareByToken,
  getShare,
  revokeShare,
  setSharePortrait,
  getOnboardingByUserId,
} = require('../db');
const { coverGenderFor } = require('../careers');
const { portraitUrlFor, sharedPortraitId } = require('../portraitUrl');
const { asyncRoute } = require('../asyncRoute');
const { SlidingWindowLimiter } = require('../rateLimit');

// Public share links: /s/:token shows one issue (cover and report) to
// anyone with the link, and link previews (WhatsApp, LinkedIn, Telegram)
// get the cover image and headline from server-written meta tags, since
// their crawlers do not run JavaScript.
//
// Privacy, by design (docs/share-page.md):
// - A link exists only when the reader creates one; tokens are 72 random
//   bits and nothing lists them.
// - The reader's own face is on the page only while they have ticked the
//   box for that link; otherwise the career's shared portrait. Removing
//   the photo clears it from every link (db.unlinkSharedPortrait).
// - The page shows the first name, the cover, the stats and the two quoted
//   answers; never the email, the other answers or anything else.
// - "Stop sharing" ends the issue's links at once.
// - The browser may name the token itself (72 random bits, the same format),
//   so the share sheet opens inside the tap with the link already in it:
//   Safari refuses a share that starts after a network wait.

const TOKEN_RE = /^[A-Za-z0-9_-]{12}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const perUserShares = new SlidingWindowLimiter({ limit: 30, windowMs: DAY_MS });

function base() {
  return (process.env.SERVER_URL || '').replace(/\/$/, '');
}

function firstName(name) {
  const first = typeof name === 'string' ? name.trim().split(/\s+/)[0] : '';
  return first ? first.slice(0, 40) : null;
}

function shareUrl(token) {
  return `${base()}/s/${token}`;
}

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

/** What a share page shows, built from the snapshot. */
function sharePayload(share) {
  const parsed = JSON.parse(share.career_result);
  const withFace = Boolean(share.personal_image_id);
  return {
    token: share.token,
    title: parsed.title,
    caption: parsed.caption || null,
    stats: { happiness: parsed.happiness, salary: parsed.salary, outlook: parsed.outlook },
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    // A cover with the reader's face is theirs; without it, who the scene
    // shows decides the Hebrew title's form, as on the result page.
    coverGender: withFace ? null : coverGenderFor(parsed.title, share.portrait_subject || 'surprise'),
    imageUrl: withFace
      ? `${base()}/api/share/${share.token}/image`
      : portraitUrlFor(parsed.title, share.portrait_subject, share.image_id, share.image_url),
    personName: share.person_name || null,
    filedAt: share.created_at,
    withFace,
  };
}

// --- The Hebrew headline for link previews (the client edition's copy) ---
let careersHe = null;
async function hebrewTitle(title, gender) {
  if (!careersHe) {
    const file = path.join(__dirname, '..', '..', 'client', 'src', 'i18n', 'careers.he.js');
    careersHe = (await import(pathToFileURL(file).href)).CAREERS_HE;
  }
  const he = careersHe[title];
  if (!he) return title;
  return gender === 'woman' ? he.titleF || he.title : he.title;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Link-preview meta tags for one share. */
async function previewTags(share) {
  const p = sharePayload(share);
  const he = share.lang === 'he';
  const title = he ? await hebrewTitle(p.title, p.coverGender) : p.title;
  const who = p.personName;
  const heading = he ? `${who ? `${who} על השער` : 'על השער'}: ${title}` : `${who ? `${who} is on the cover` : 'On the cover'}: ${title}`;
  const description = he
    ? 'התחזית, הראיות והניתוח המלא. גם לכם מגיע שער.'
    : 'The forecast, the evidence and the full analysis. Get your own cover.';
  const image = `${base()}/api/share/${share.token}/og.jpg`;
  return [
    ['og:type', 'article'],
    ['og:title', heading],
    ['og:description', description],
    ['og:url', shareUrl(share.token)],
    ['og:image', image],
    ['og:image:width', '600'],
    ['og:image:height', '750'],
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', heading],
    ['twitter:image', image],
  ].map(([k, v]) => `<meta ${k.startsWith('twitter:') ? 'name' : 'property'}="${k}" content="${escapeHtml(v)}" />`)
    .concat(`<title>${escapeHtml(heading)} | CareerPredict</title>`, '<meta name="robots" content="noindex" />')
    .join('\n    ');
}

/**
 * The page's index.html with the share's preview tags in place of the
 * generic ones. index.html is read once; tests pass their own.
 */
function renderSharePage(indexHtml, tags) {
  return indexHtml
    .replace(/\s*<meta property="og:[^>]*>/g, '')
    .replace(/\s*<meta\s+property="og:[\s\S]*?\/>/g, '')
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

function createShareRouter({ imageService, indexHtml = null, clientDist = null }) {
  const router = express.Router();
  let cachedIndex = indexHtml;
  const readIndex = () => {
    if (cachedIndex == null && clientDist) {
      try {
        cachedIndex = fs.readFileSync(path.join(clientDist, 'index.html'), 'utf8');
      } catch {
        cachedIndex = '';
      }
    }
    return cachedIndex;
  };

  // The reader's own portrait for their current issue, for a link of that
  // issue; null when there is none (or it failed).
  const facePortrait = (row) => (row.personal_image_id && row.personal_status !== 'failed' ? row.personal_image_id : null);
  const owned = (share, userId) => share && share.user_id === userId && !share.revoked_at;
  const linkBody = (share) => ({ url: shareUrl(share.token), token: share.token, withFace: Boolean(share.personal_image_id) });

  // POST /api/user/share { withFace, lang, token? } -> { url, token, withFace }
  // With a token (named by the browser, already in the share sheet) the call
  // is idempotent: a retry of the same token returns the same link.
  router.post(
    '/api/user/share',
    requireAuth,
    asyncRoute(
      async (req, res) => {
        const row = await getOnboardingByUserId(req.user.id);
        if (!row) return res.status(409).json({ error: 'Take the questionnaire first.' });
        const wantFace = req.body?.withFace === true;
        const personalImageId = wantFace ? facePortrait(row) : null;
        if (wantFace && !personalImageId) {
          return res.status(409).json({ error: 'There is no photo of you on this cover to share.' });
        }
        const lang = req.body?.lang === 'he' ? 'he' : 'en';
        const chosen = req.body?.token;
        if (chosen !== undefined && (typeof chosen !== 'string' || !TOKEN_RE.test(chosen))) {
          return res.status(400).json({ error: 'Invalid link' });
        }
        if (chosen) {
          const taken = await findShareByToken(chosen);
          if (taken) {
            if (owned(taken, req.user.id)) return res.json(linkBody(taken));
            return res.status(409).json({ error: 'Could not create a share link. Please try again.' });
          }
        } else {
          const existing = await findLiveShare(req.user.id, row.career_result, personalImageId);
          if (existing) return res.json(linkBody(existing));
        }

        const key = `user:${req.user.id}`;
        if (!perUserShares.allows(key)) return res.status(429).json({ error: 'That is a lot of sharing for one day. Try again tomorrow.' });
        perUserShares.record(key);
        const token = chosen || crypto.randomBytes(9).toString('base64url');
        try {
          await createShare({
            token,
          userId: req.user.id,
          careerResult: row.career_result,
          imageId: row.image_id,
          imageUrl: row.image_url,
          portraitSubject: row.portrait_subject,
          personalImageId,
            personName: firstName(req.user.name),
            lang,
          });
        } catch (err) {
          // Two requests with the same token racing (a retry that crossed
          // the first): the token's UNIQUE constraint lets one in.
          const raced = chosen ? await findShareByToken(chosen) : null;
          if (owned(raced, req.user.id)) return res.json(linkBody(raced));
          throw err;
        }
        res.status(201).json({ url: shareUrl(token), token, withFace: Boolean(personalImageId) });
      },
      { label: 'POST /api/user/share', message: 'Could not create a share link. Please try again.' },
    ),
  );

  // PATCH /api/user/share/:token { withFace } - show or hide the reader's own
  // portrait on a link they already sent; the link itself stays the same.
  router.patch(
    '/api/user/share/:token',
    requireAuth,
    asyncRoute(
      async (req, res) => {
        if (!TOKEN_RE.test(req.params.token)) return res.status(400).json({ error: 'Invalid link' });
        const share = await findShareByToken(req.params.token);
        if (!owned(share, req.user.id)) return res.status(404).json({ error: 'Not found' });
        let personalImageId = null;
        if (req.body?.withFace === true) {
          const row = await getOnboardingByUserId(req.user.id);
          // Only the portrait of the issue this link shows: after a retake
          // the current photo belongs to a different cover.
          personalImageId = row && row.career_result === share.career_result ? facePortrait(row) : null;
          if (!personalImageId) return res.status(409).json({ error: 'There is no photo of you on this cover to share.' });
        }
        await setSharePortrait(req.user.id, share.token, personalImageId);
        res.json(linkBody({ ...share, personal_image_id: personalImageId }));
      },
      { label: 'PATCH /api/user/share', message: 'Could not update the share link. Please try again.' },
    ),
  );

  // DELETE /api/user/share/:token - stop sharing.
  router.delete(
    '/api/user/share/:token',
    requireAuth,
    asyncRoute(
      async (req, res) => {
        if (!TOKEN_RE.test(req.params.token)) return res.status(400).json({ error: 'Invalid link' });
        const ok = await revokeShare(req.user.id, req.params.token);
        if (!ok) return res.status(404).json({ error: 'Not found' });
        res.status(204).end();
      },
      { label: 'DELETE /api/user/share', message: 'Could not stop sharing. Please try again.' },
    ),
  );

  async function liveShare(req, res) {
    if (!TOKEN_RE.test(req.params.token)) {
      res.status(404).json({ error: 'Not found' });
      return null;
    }
    const share = await getShare(req.params.token);
    if (!share) res.status(404).json({ error: 'This issue is no longer shared.' });
    return share;
  }

  // GET /api/share/:token - the public page's data.
  router.get(
    '/api/share/:token',
    asyncRoute(
      async (req, res) => {
        const share = await liveShare(req, res);
        if (!share) return;
        res.set('Cache-Control', 'no-store');
        res.json(sharePayload(share));
      },
      { label: 'GET /api/share', message: 'Could not load this issue.' },
    ),
  );

  // GET /api/share/:token/image - the reader's own portrait, only through a
  // link they chose to share it on. Same polling contract as /api/image/:id.
  router.get(
    '/api/share/:token/image',
    asyncRoute(
      async (req, res) => {
        const share = await liveShare(req, res);
        if (!share) return;
        if (!share.personal_image_id) return res.status(404).send('not found');
        const blob = await imageService.blobStore.get(share.personal_image_id);
        if (!blob) {
          res.set('Retry-After', '8');
          return res.status(404).send('not ready');
        }
        res.set('Content-Type', blob.mimeType);
        // Short and revalidated: stopping a share or removing the photo has
        // to take effect, not live on in caches for a year.
        res.set('Cache-Control', 'public, max-age=300');
        res.send(blob.buffer);
      },
      { label: 'GET /api/share/image', message: 'Could not load the portrait.' },
    ),
  );

  // GET /api/share/:token/og.jpg - the preview image link unfurlers fetch:
  // the portrait as a small JPEG (some unfurlers still skip WebP).
  router.get(
    '/api/share/:token/og.jpg',
    asyncRoute(
      async (req, res) => {
        const share = await liveShare(req, res);
        if (!share) return;
        const parsed = JSON.parse(share.career_result);
        const id = share.personal_image_id || sharedPortraitId(parsed.title, share.portrait_subject, share.image_id);
        const blob = id ? await imageService.blobStore.get(id) : null;
        if (!blob) return res.status(404).send('not ready');
        const jpeg = await sharp(blob.buffer).resize(600, 750, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=300');
        res.send(jpeg);
      },
      { label: 'GET /api/share/og', message: 'Could not load the preview.' },
    ),
  );

  // GET /s/:token - the SPA's page with this share's preview tags. An
  // unknown or ended link still gets the app (which says so), with the
  // generic tags.
  router.get(
    '/s/:token',
    asyncRoute(
      async (req, res) => {
        const html = readIndex();
        if (!html) return res.status(404).send('Not found');
        const share = TOKEN_RE.test(req.params.token) ? await getShare(req.params.token) : null;
        res.set('Cache-Control', 'no-store');
        res.type('html').send(share ? renderSharePage(html, await previewTags(share)) : html);
      },
      { label: 'GET /s/:token', message: 'Could not load this issue.' },
    ),
  );

  return router;
}

module.exports = { createShareRouter, renderSharePage, sharePayload };
