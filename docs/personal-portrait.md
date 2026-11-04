# Personal portrait ("put my face on the cover"): plan

Status: gated on a likeness test. Nothing user-facing is built yet.

## Decision so far

- Two paths, side by side:
  - **Public path (default, unchanged in spirit).** No upload. The portrait
    is the career's shared, cached image, so every reader with a title gets
    the same shot. Proposed addition: a "Shoot me as" choice (a man / a
    woman / surprise me), each a cached variant per career.
  - **Personal path (opt-in).** The reader uploads a photo and the cover is
    shot with their face.
- The personal path is built only if the likeness test passes.

## 1. Likeness test (first, before any feature code)

`cd server && npm run check:likeness` renders three career scenes with a
reference face on each image model that accepts an input image, and writes
an HTML contact sheet.

- References default to two **synthetic** faces committed in
  `server/scripts/fixtures/` (served from GitHub, since the model fetches the
  reference by URL). Before this branch is merged, pass them explicitly:
  `--ref https://raw.githubusercontent.com/Royc4515/career-predictor/<branch>/server/scripts/fixtures/likeness-ref1.jpg`.
- Default models are the two that accept an image and are not paid-only on
  Pollinations (checked against the live catalogue on 2026-11-02):
  `microsoft/mai-image-2.6` and `microsoft/mai-image-2.6-flash`. Add paid
  ones with `--models` to compare (for example
  `google/gemini-nano-banana-2.1`, `black-forest-labs/flux.2-pro`).
- Needs `POLLINATIONS_API_KEY` in the environment, and the key must be
  allowed to use those models (the script says so if it is restricted).
- Cost: models x references x scenes renders (12 by default).

**Pass criteria** (judged by a person on the sheet):
1. A friend would recognise the reference in at least 5 of 6 renders per model.
2. The scene's joke still reads (props, setting, framing for the cover).
3. No text or watermark artefacts.
4. Under about 30 s per render.

If only paid models pass, the feature costs money per user. That is a
product decision, not a technical one.

## 1b. Result (2026-11-04)

Run with the two synthetic fixtures, both default models, 3 scenes each:
12 requests, 11 images, about 0.3 pollen in total.

| Criterion | MAI 2.6 | MAI 2.6 flash |
|---|---|---|
| Recognisable as the reference | 6 of 6 | 5 of 5 rendered |
| Joke still reads (balloon, head torch and brush, falafel tower with level) | yes | yes |
| Text or watermark artefacts | none seen | none seen |
| Time per render | 21-24 s | 18-20 s |
| Blocked by content moderation | 0 | 1 (founder scene, woman reference; a false positive) |

**Verdict: pass, with two caveats.**
1. The references are synthetic, "model-typical" faces, the easiest case for
   a model. Before launch, repeat with a real, consenting person's ordinary
   phone selfie (uneven light, angle).
2. Moderation can refuse a harmless request. The personal path needs a
   fallback: retry once on the other MAI model, then fall back to the shared
   public portrait with a short "the darkroom refused this one" note.

Default model for the feature: `microsoft/mai-image-2.6-flash` (half the
price, a little faster, same likeness here), with `mai-image-2.6` as the
retry.

Running it from a dev container whose network proxy injects the key: Node's
built-in fetch ignores HTTPS_PROXY unless started with NODE_USE_ENV_PROXY=1.

## 2. If it passes: the personal path

**Flow.** Result page, "Put your face on it" (opt-in) -> consent screen ->
upload or camera -> "Developing" -> the same cover, now with their face.

**Server.**
- `POST /api/user/portrait` (signed-in only, rate limited per user and
  per IP). Accepts one JPEG/PNG/WebP up to ~5 MB. Validated by magic bytes,
  not by extension; re-encoded server-side (strips EXIF and GPS).
- The upload is stored under a random 128-bit token and served at
  `GET /api/ref/:token` for **10 minutes, at most a few fetches**: the model
  needs a public URL. Deleted right after generation, success or failure.
- Generation goes through `ImageService` with a new `reference` input. The
  image id hashes the scene prompt, the seed **and the user id**, so personal
  portraits never collide with the shared cache or with another user's.
- Only the finished portrait is kept, in a durable store. **This requires
  `IMAGE_STORE=r2`**: on Render's free tier the disk is wiped on every
  deploy, so a personal cover would vanish.
- Delete: "Remove my portrait" deletes the stored result; retaking the
  questionnaire keeps or drops it explicitly.

**Prompts.** A personal portrait needs a scene without a stated age, gender
or background (the photo supplies identity), so each career needs a neutral
`scene` alongside its current prompt. `checkLikeness.js` uses three such
scenes as the pattern.

**Privacy (Israel Privacy Protection Law, Amendment 13; GDPR-style rules).**
A face photo is biometric, sensitive data.
- Explicit opt-in consent screen: what is sent (the photo, to Pollinations
  and its model provider), for what (one portrait), how long it is kept (the
  photo: deleted within minutes; the portrait: until you remove it).
- Text on the consent screen: "Only upload your own photo." Abuse report link.
- Not offered when signed out. No minors in the target audience; say so.
- The landing page's Corrections box currently says your data never goes to
  the image model. It must be updated in the same change.

## 3. Public path: "Shoot me as"

- A small choice before the cover prints: a man / a woman / surprise me.
- "Surprise me" keeps today's prompt (the series is deliberately varied).
- Each career gets two subject descriptions (`subjects.man`,
  `subjects.woman`) plus the shared scene; the image id includes the choice,
  so each variant is generated once and shared like today.
- 40 careers x 2 new subject lines, written in the same house style.

## Order of work

1. Likeness test (needs the key in this environment).
2. R2 store for durable images (needed by 2.x, useful today).
3. Public "Shoot me as" (independent of the test).
4. Personal path, only if step 1 passed.
