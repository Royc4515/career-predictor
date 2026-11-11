import { COVER, headlineScale, wrapLines } from './coverLayout';
import { barcodeBars, issueFor } from './issue';
import { UI_EN } from '../i18n/ui.en.js';
import { UI_HE } from '../i18n/ui.he.js';

// Renders the cover to a PNG so "Download" and "Share" hand over the design
// itself, not a bare photo. Mirrors components/Cover.jsx using the shared
// proportions in coverLayout.js.

const WIDTH = 1080;
const HEIGHT = 1350;
const SERIF = '"Newsreader Variable", "Frank Ruhl Libre Variable", Georgia, serif';
const SANS = '"Schibsted Grotesk Variable", "Heebo Variable", system-ui, sans-serif';
// Hebrew first for Hebrew lines: with the Latin face first, canvas shaped
// each Hebrew letter as its own fallback run and spread them apart.
const SERIF_HE = '"Frank Ruhl Libre Variable", "Newsreader Variable", Georgia, serif';
const SANS_HE = '"Heebo Variable", "Schibsted Grotesk Variable", system-ui, sans-serif';
const PAPER = '#f3f4f1';
const INK = '#13203a';
const MARK = '#f6e24a';
const COVER_BG = '#0f1626';

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    // Required for toBlob(): without CORS the canvas is tainted and export
    // throws. The server's cors() middleware answers for CLIENT_URL; in
    // production the image is same-origin anyway.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCoverFit(ctx, img) {
  const scale = Math.max(WIDTH / img.naturalWidth, HEIGHT / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
}

function verticalScrim(ctx, y0, y1, from, to) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.min(y0, y1), WIDTH, Math.abs(y1 - y0));
}

function spaced(ctx, text, x, y, tracking, align = 'left') {
  // Canvas letterSpacing is not in every browser yet; draw glyph by glyph
  // so tracked uppercase labels match the CSS version everywhere.
  const chars = [...text];
  const total = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + tracking * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + tracking;
  }
  ctx.textAlign = prev;
  return total;
}

/**
 * The cover as a 1080x1350 PNG. `lang` 'he' mirrors it like the on-screen
 * cover in a right-to-left page: text set from the right, barcode on the
 * left. Hebrew lines are drawn whole with ctx.direction = 'rtl' (glyph by
 * glyph would lay the letters out backwards), without the display tracking
 * the Latin face gets.
 */
export async function renderCoverBlob({ title, imageUrl, personName, happiness, lang = 'en', includePhoto = true }) {
  const rtl = lang === 'he';
  const c = (rtl ? UI_HE : UI_EN).cover;
  const serif = rtl ? SERIF_HE : SERIF;
  const sans = rtl ? SANS_HE : SANS;
  // Fonts are self-hosted and usually loaded already; this makes sure the
  // canvas never silently falls back to Georgia for the masthead.
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load(`600 100px ${SERIF}`),
      document.fonts.load(`500 100px ${SERIF}`),
      document.fonts.load(`600 20px ${SANS}`),
      document.fonts.load(`400 20px ${SANS}`),
      // A Hebrew face loads only for Hebrew text, so ask with a sample.
      ...(rtl
        ? [
            document.fonts.load(`500 100px ${SERIF_HE}`, 'אב'),
            document.fonts.load(`600 20px ${SANS_HE}`, 'אב'),
            document.fonts.load(`400 20px ${SANS_HE}`, 'אב'),
          ]
        : []),
    ]).catch(() => {});
  }

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const u = (f) => f * WIDTH;
  const pad = u(COVER.pad);

  ctx.fillStyle = COVER_BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const img = includePhoto ? await loadImage(imageUrl) : null;
  if (img) drawCoverFit(ctx, img);

  verticalScrim(ctx, 0, HEIGHT * 0.34, 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0)');
  verticalScrim(ctx, HEIGHT, HEIGHT * 0.42, 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0)');

  // Masthead
  ctx.fillStyle = PAPER;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `600 ${u(COVER.mastheadSize)}px ${SERIF}`;
  const mastY = u(COVER.mastheadTop) + u(COVER.mastheadSize) * 0.78;
  spaced(ctx, 'CareerPredict', WIDTH / 2, mastY, -u(COVER.mastheadSize) * 0.045, 'center');

  // Issue line under a single hairline, sentence case like the DOM cover.
  const issue = issueFor(new Date(), lang);
  ctx.direction = rtl ? 'rtl' : 'ltr';
  // x of the reading start and end edges; textAlign 'start'/'end' follow
  // ctx.direction.
  const startX = rtl ? WIDTH - pad : pad;
  const endX = rtl ? pad : WIDTH - pad;
  const lineTop = mastY + u(0.035);
  ctx.strokeStyle = 'rgba(243,244,241,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, lineTop);
  ctx.lineTo(WIDTH - pad, lineTop);
  ctx.stroke();
  ctx.font = `500 ${u(COVER.issueSize)}px ${sans}`;
  const issueY = lineTop + u(0.012) + u(COVER.issueSize) * 0.9;
  ctx.textAlign = 'start';
  ctx.fillText(c.issue(issue.number), startX, issueY);
  ctx.textAlign = 'center';
  ctx.fillText(c.forecast, WIDTH / 2, issueY);
  ctx.textAlign = 'end';
  ctx.fillText(issue.short, endX, issueY);

  if (!img) {
    // Same safelight as the on-screen darkroom so a photo-less cover still
    // looks intentional.
    const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT * 0.56, 0, WIDTH / 2, HEIGHT * 0.56, WIDTH * 0.6);
    glow.addColorStop(0, 'rgba(214,92,38,0.32)');
    glow.addColorStop(1, 'rgba(214,92,38,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Bottom block, laid out upward from the bottom edge.
  const barW = u(COVER.barcodeWidth);
  const barH = u(COVER.barcodeHeight);
  const bottom = HEIGHT - pad;

  // The barcode sits at the reading end of the bottom row.
  const barX = rtl ? pad : WIDTH - pad - barW;
  ctx.fillStyle = PAPER;
  ctx.fillRect(barX, bottom - barH, barW, barH);
  const bars = barcodeBars(title);
  const innerPad = u(0.012);
  const unit = (barW - innerPad * 2) / bars.reduce((s, w) => s + w, 0);
  let bx = barX + innerPad;
  ctx.fillStyle = INK;
  bars.forEach((w, i) => {
    if (i % 2 === 0) ctx.fillRect(bx, bottom - barH + innerPad, w * unit, barH * 0.62);
    bx += w * unit;
  });
  ctx.font = `600 ${u(0.014)}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('$0.00', barX + barW / 2, bottom - innerPad * 0.7);

  const deckSize = u(COVER.deckSize);
  ctx.font = `400 ${deckSize}px ${sans}`;
  ctx.fillStyle = 'rgba(243,244,241,0.85)';
  ctx.textAlign = 'start';
  const deck = `${personName ? c.forecastFor(personName) : ''}${c.happiness} ${happiness}/100.`;
  const deckLines = wrapLines(deck, WIDTH - pad * 2 - barW - u(0.03), (t) => ctx.measureText(t).width);
  let y = bottom - (deckLines.length - 1) * deckSize * 1.3;
  deckLines.forEach((line, i) => ctx.fillText(line, startX, y + i * deckSize * 1.3));

  const headSize = u(headlineScale(title));
  ctx.font = `500 ${headSize}px ${serif}`;
  ctx.fillStyle = PAPER;
  const headLines = wrapLines(title, WIDTH - pad * 2, (t) => ctx.measureText(t).width);
  const lead = headSize * 0.98;
  // The headline sits above whichever is taller, the deck text or the
  // barcode, so a long title can never run into the barcode.
  const blockTop = Math.min(y - deckSize * 0.9, bottom - barH);
  y = blockTop - u(0.035) - (headLines.length - 1) * lead;
  headLines.forEach((line, i) =>
    rtl ? ctx.fillText(line, startX, y + i * lead) : spaced(ctx, line, pad, y + i * lead, -headSize * 0.03, 'left'),
  );

  const kickerSize = u(COVER.kickerSize);
  ctx.font = `600 ${kickerSize}px ${sans}`;
  ctx.textAlign = 'start';
  const kickerW = ctx.measureText(c.kicker).width;
  const kickerBoxH = kickerSize + u(0.01);
  const kickerTop = y - headSize * 0.82 - u(0.02) - kickerBoxH;
  ctx.fillStyle = MARK;
  const kickerBoxW = kickerW + u(0.028);
  ctx.fillRect(rtl ? WIDTH - pad - kickerBoxW : pad, kickerTop, kickerBoxW, kickerBoxH);
  ctx.fillStyle = INK;
  ctx.fillText(c.kicker, rtl ? startX - u(0.014) : pad + u(0.014), kickerTop + kickerBoxH / 2 + kickerSize * 0.36);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Cover export failed'))), 'image/png');
    } catch (err) {
      // A tainted canvas (photo served without CORS) throws here. Retry
      // without the photo rather than failing the download outright.
      if (includePhoto) {
        renderCoverBlob({ title, imageUrl, personName, happiness, lang, includePhoto: false }).then(resolve, reject);
      } else {
        reject(err);
      }
    }
  });
}
