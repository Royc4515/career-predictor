# Redesign plan: CareerPredict, "The Forecast" edition

Status: decided and implemented on `claude/cool-hawking-jcipyg`.
Scope: full client rebuild plus an image-pipeline upgrade. Auth, sessions, DB,
routes and the `ImageService` contract are kept as they are.

---

## 1. What the project actually is

| Layer | Reality |
|---|---|
| Promise on the page | "Proprietary AI analyzes your professional DNA across 847 career trajectories with 99.7% accuracy." |
| What runs | A hand-written rule table (`mapCareer`) that maps 5 multiple-choice answers to 45 joke titles, each with a caption, three fake stats and a scene prompt. |
| The only real AI | One text-to-image call per career, generated in the background and served from a content-addressed cache. |
| The joke | Deadpan parody of AI career assessments and LinkedIn self-optimization culture. |
| The deliverable a user leaves with | A title, a portrait, a screenshot. |

So the product is a **satire whose punchline is presentation**. The more
seriously the page takes itself, the better the joke lands. The old UI looked
like a generic dark SaaS template (indigo accent, mono "ANALYSIS COMPLETE"
labels, cards on slate). That is the exact look being parodied, so it read as
"another AI site" rather than as a parody of one.

What was missing:

1. **A keepsake.** The share action shared a sentence; the download saved a bare
   square image. Nothing was worth posting.
2. **Image quality.** Verified on 2026-11-01: the keyless
   `image.pollinations.ai` endpoint the default chain uses ignores
   `model=flux-realism` and answers with `x-model-used: sana` (Dreamshaper 8 LCM,
   the cheapest model on the platform). Modern models (Z-Image Turbo,
   FLUX.1.1 pro, FLUX.2, MAI Image) now live behind `gen.pollinations.ai` and
   require an API key.
3. **Prompt style from 2023.** "8K UHD, award-winning, hyperdetailed" tag soup is
   what makes images look like AI output. Current models follow plain,
   photographer-style direction.
4. **No art direction across results.** Each image looked unrelated to the next.

## 2. Research summary

Design and motion (2026):

- Typography-led, editorial layouts have replaced gradient-blob hero sections
  as the premium signal; serif/sans pairing for editorial contrast.
- CSS scroll-driven animations (`animation-timeline: view()`) are now native in
  all major engines, so reveal-on-scroll needs no JS library.
- Cross-document and SPA View Transitions are standard; React Router 7 exposes
  them through `viewTransition` on `navigate`/`Link` in data-router mode.
- Restraint is the consensus: motion should clarify, honor
  `prefers-reduced-motion`, and avoid scroll-jacking.
- "AI slop" tells to avoid: purple/indigo gradients, glassmorphism cards,
  Inter everywhere, mono uppercase status labels, emoji icons, sparkle icons,
  fake dashboards, "10x" copy.

Image generation (verified against the live catalogue at
`https://gen.pollinations.ai/image/models` and Cloudflare's changelog):

- `gen.pollinations.ai` with a key: `tongyi-mai/z-image-turbo` (default, free
  tier, seeded), `black-forest-labs/flux.1.1-pro` (free tier, seeded),
  `microsoft/mai-image-2.6` (free tier, photoreal), plus paid FLUX.2 / GPT Image
  / Gemini models selectable by env.
- Cloudflare Workers AI: `@cf/black-forest-labs/flux-2-klein-9b` (Jan 2026,
  4-step distilled, multipart form input, seed supported).

## 3. Three directions

### Option A - "The Forecast" (editorial print) - **chosen**

A career magazine that has decided to put *you* on the cover.

- Palette from the office, not the newsstand (revised after review, see section 5):
  cool copy paper, blue-black ballpoint ink, one yellow highlighter.
- Newsreader (variable, optical sizes 6 to 72) for display and body,
  Schibsted Grotesk (a grotesk drawn for a newspaper group) for UI text.
  No mono, no Inter.
- The result is a **magazine cover**: masthead, issue line, full-bleed portrait,
  headline set in display serif, cover lines built from the fake stats.
- Loading becomes "going to press"; the portrait "develops" like a darkroom
  print (blur and exposure resolving) when the bytes arrive.
- Download produces a composed cover PNG (canvas), so the share artifact is the
  design itself.
- Motion: one masked headline reveal on the landing page, View Transitions
  between steps, the darkroom develop on the result, and a highlighter stroke
  when an answer is chosen. Nothing moves on its own beyond that.

Risks: needs strong typesetting discipline; light theme only.

### Option B - "Instrument" (dark data lab)

Near-black canvas, WebGL noise field, HUD-style live readouts, the "analysis"
staged as a terminal and data visualizations.

Why not: it is the old site with more effects. It is also the visual language
of every AI product in 2026, which is precisely the slop the brief rules out,
and it would turn the parody into the thing it parodies.

### Option C - "Liquid" (spatial glass)

Translucent glass panels, 3D tilt cards, aurora gradients, the portrait as a
holographic trading card.

Why not: trend-dated within months, heavy on mobile GPUs, poor text contrast,
and aurora gradients are the single most recognizable AI-generated-site tell.

### Decision

**Option A.** It is the only direction where the presentation itself is the
joke (deadpan seriousness), it produces a shareable artifact, it ages well, and
it frames AI images as editorial photography, which hides model artifacts
better than a floating card does. Option B contributes one idea: the fake
stats are typeset as a sober "report" with hairline charts, not as a dashboard.

## 4. Implementation

Server (contract unchanged; additive only):

- `providers/pollinationsGenProvider.js` - `gen.pollinations.ai`, Bearer key,
  model from `POLLINATIONS_IMAGE_MODEL` (default `tongyi-mai/z-image-turbo`).
- `providers/cloudflareFlux2Provider.js` - FLUX.2 [klein] 9B via multipart form.
- `ImageService` accepts an optional `size`; production uses 896x1120 (4:5
  portrait, valid for every provider's constraints). Default stays 768x768 so
  the spec test is untouched.
- `promptBuilder` enrichment rewritten as a consistent house style: editorial
  magazine photography, natural language, no tag soup, explicit "no text" so
  models do not hallucinate lettering.
- Default chain becomes `pollinations_gen,pollinations` when a key is present.

Client:

- Design tokens in CSS (`@theme`), self-hosted variable fonts (no Google Fonts
  request), `motion` through `LazyMotion` (only the features used ship), React
  Router data router for View Transitions, lazy-loaded signed-in routes.
- Pages rebuilt: Landing, Questionnaire, Press (loading), Cover (result).
- Keyboard-first quiz (1 to 4, Enter, Backspace), visible focus, 44px targets,
  reduced-motion fallbacks everywhere.
- Image polling via `HEAD` with backoff instead of `<img>` error retries.
- Cover composer: renders the cover to a 1080x1350 PNG for download/share.

Not changed: Google OAuth flow, session/cookie config, SQLite schema,
`mapCareer` titles, captions, stats and scene prompts, option copy in the quiz
(string-coupled to `mapCareer`, see CLAUDE.md). The rule *selection* did
change in the second pass (section 6).

## 5. Review against Anthropic's frontend-design skill

After the first build, the work was checked against the official
`frontend-design` skill (github.com/anthropics/skills, `skills/frontend-design`).
Its calibration list of AI-generated design tells matched several first-pass
choices, so the concept stayed and the execution was revised:

| Tell named by the skill | First pass | Revision |
|---|---|---|
| Warm cream + serif + terracotta accent | `#f3efe6` paper, print red `#c63a20` | Cool copy paper `#f3f4f1`, ballpoint ink `#13203a`, highlighter `#f6e24a`. Grounded in the subject: a corporate career assessment, marked up like a performance review |
| Broadsheet hairlines, double rules | Double rule under every masthead, rules everywhere | One rule under the masthead, rules only between real list items |
| Tracked ALL-CAPS eyebrow labels, `A / B` meta strings | `.folio` labels above most headings | Sentence-case `.meta` text, only where it carries information |
| One word accented in the headline | "unwarranted" in red italic | Plain headline; the type size and the reveal carry it |
| `→` appended to buttons | On every CTA | Removed; button text says what happens |
| Fade-and-rise on every section, perpetual motion | Scroll reveals on each section, a market ticker, animated grain | One load sequence on the landing page, the darkroom develop on the result page, and motion only in response to actions (the highlighter stroke on a chosen answer) |
| Big number with a small label | Giant question numeral, giant loading percentage | "Question 2 of 5" text and a progress bar |
| Decorative numbering | Fake page numbers in an "In this issue" list | Hero shows a real cover specimen instead; numbers kept only for the three-step sequence |
| Mood copy on errors | "Stop the presses." | "Your answers weren't sent", what is still saved, and the action to take |

Other fixes from the same pass:

- Contrast checked numerically: every text pairing is WCAG AA (lowest 4.61:1).
  The first-pass muted gray was about 3.7:1 on its background, which fails for small text.
- Copy fact-checked against the code: the table has 45 unique titles (not 46);
  the privacy note now lists everything stored (Google name, email, profile
  photo link, answers); README sample titles that did not exist were replaced.
- Removed the fictional testimonials and the ticker; they were template
  sections, not content.

Reference material consulted: the frontend-design skill above, Awwwards
inspiration collections for editorial typography and scroll work (Locomotive's
Editorial New showcase, Adoratorio's editorial layout for Mara). No design MCP
was used; designs were iterated in code with Playwright screenshots at
1440x900 and 390x844, including a reduced-motion pass.

## 6. Second pass: four published skills as auditors

The skills listed in `design-resources.md` were cloned from GitHub and each
used as an independent read-only audit of the code and screenshots: Vercel's
Web Interface Guidelines, Vercel's react-view-transitions, Emil Kowalski's
animation skills, and Impeccable plus Taste Skill. Every finding was checked
against the code before acting.

Product bug found while building the sample endpoint: only 13 of the 45
careers could be reached from the quiz. Tier 1 (field + goal) always matched
because the client always sends both answers, so 32 hand-written careers were
dead code. Now each tier proposes its first match and a stable hash of all
five answers picks one: deterministic, every answer matters, 44 of 45 reachable
(the 45th is the explicit fallback). A test enumerates all 1,024 answer sets.

Implemented from the audits:

- Interface: quiz step in the URL so browser Back works; one `.btn` system
  with press feedback; `touch-action: manipulation`; hover more emphatic than
  rest; curly quotes and ellipses; `text-wrap: balance` on headings;
  `translate="no"` on the brand; display font preloaded at build time; the
  cover headline is no longer an `h2` above the page `h1`; error fallback
  copy says what to do.
- Layout and type: five-step type scale tokens (`text-display`, `-title`,
  `-section`, `-lede`, `-body`); running text in full ink; result page leads
  with a larger cover, a smaller title and the actions above the fold;
  figures in a tinted field instead of a grid of hairlines; landing hero shows
  a real sample portrait from `GET /api/samples`; "How it works" as a contents
  list and the facts as a magazine "Corrections" box; the quiz's empty right
  column holds "Your file so far" with the chosen answers highlighted; the
  loading page prints a cover beside the checklist and sets the real headline
  at the "Setting your headline" step; minimum on-screen sizes for cover small
  print.
- Motion: shared easing constants; transforms as `transform` strings so they
  run on the compositor; the photo develops only after it decodes (safelight
  stays on until then); loading bar on the Web Animations API (6 renders
  instead of ~600); quiz exits in the correct direction with tighter timing;
  highlighter drawn with `clip-path` so its ragged ends survive; toast and
  button labels swap in place; directional route slides through the quiz flow;
  masthead pinned during transitions; reduced motion keeps fades instead of
  removing everything; lighter develop filter.

Declined, with reasons: cropping the Pollinations watermark (removing the
provider's attribution is not ours to do; an API key removes it properly);
numerals instead of spelled-out small numbers (editorial style); an animated
"Cover story" tag on arrival (the auditor itself flagged it as excess).

## 7. Third pass: signature effects

Feedback after the second pass: not enough striking motion. The brief now
explicitly asks for bolder effects, so this pass spends more of the motion
budget, still drawn from the concept's own world (printing, magazines, an
office) rather than generic AI-site effects, and every one has a fallback.

| Effect | Where | How | Fallback |
|---|---|---|---|
| Press reveal | Landing specimen, result cover | Paper Shaders `HalftoneCmyk` (WebGL2): the portrait is printed as coarse CMYK dots that tighten until they disappear into the photo | No WebGL2, reduced motion, or a shader error: darkroom fade |
| Gloss tilt | Landing specimen, result cover | Spring-driven 3D tilt toward the pointer with a soft-light gloss highlight | Touch and reduced motion: flat cover |
| Variable-weight headline | Landing hero | Newsreader weight axis, letters near the pointer go from 400 to 720; direct style writes in one rAF, no re-renders | Touch and reduced motion: static |
| Back-issue fan | Landing | Five real sample covers pinned with `position: sticky`, fanned by scroll progress | Reduced motion: shown fanned, not pinned |
| CMYK misregistration + print head | Loading cover | `@property --mis` animates C, M and Y offsets into register over the print run; a highlighter-yellow print head sweeps the sheet | Reduced motion: aligned, no sweep |
| Rubber stamp | Result | "APPROVED / NOT CAREER ADVICE" slams down on a stiff spring once the cover is revealed, the cover takes a small impact shake; rough ink edges from an SVG displacement filter; once per cover per session | Reduced motion and repeat visits: already stamped |
| Odometer | Result happiness index | Digit wheels roll to the value, rightmost last | Reduced motion: static number |
| Barcode laser | Every cover | A red scanner line sweeps the barcode on hover | Touch: none |

Robustness: effects are wrapped in an error boundary, the shader loads as its
own chunk (30 KB gzipped) only when a cover prints, and the main bundle grew
by about 6 KB.
