import { COVER, headlineScale, wrapLines } from './coverLayout';
import { barcodeBars, issueFor } from './issue';

// Renders the cover to a PNG so "Download" and "Share" hand over the design
// itself, not a bare photo. Mirrors components/Cover.jsx using the shared
// proportions in coverLayout.js.

const WIDTH = 1080;
const HEIGHT = 1350;
const SERIF = '"Newsreader Variable", Georgia, serif';
const SANS = '"Schibsted Grotesk Variable", system-ui, sans-serif';
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

export async function renderCoverBlob({ title, imageUrl, personName, happiness, includePhoto = true }) {
  // Fonts are self-hosted and usually loaded already; this makes sure the
  // canvas never silently falls back to Georgia for the masthead.
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load(`600 100px ${SERIF}`),
      document.fonts.load(`500 100px ${SERIF}`),
      document.fonts.load(`600 20px ${SANS}`),
      document.fonts.load(`400 20px ${SANS}`),
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
  const issue = issueFor();
  const lineTop = mastY + u(0.035);
  ctx.strokeStyle = 'rgba(243,244,241,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, lineTop);
  ctx.lineTo(WIDTH - pad, lineTop);
  ctx.stroke();
  ctx.font = `500 ${u(COVER.issueSize)}px ${SANS}`;
  const issueY = lineTop + u(0.012) + u(COVER.issueSize) * 0.9;
  ctx.textAlign = 'left';
  ctx.fillText(`Issue ${issue.number}`, pad, issueY);
  ctx.textAlign = 'center';
  ctx.fillText('The Forecast', WIDTH / 2, issueY);
  ctx.textAlign = 'right';
  ctx.fillText(issue.short, WIDTH - pad, issueY);

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

  ctx.fillStyle = PAPER;
  ctx.fillRect(WIDTH - pad - barW, bottom - barH, barW, barH);
  const bars = barcodeBars(title);
  const innerPad = u(0.012);
  const unit = (barW - innerPad * 2) / bars.reduce((s, w) => s + w, 0);
  let bx = WIDTH - pad - barW + innerPad;
  ctx.fillStyle = INK;
  bars.forEach((w, i) => {
    if (i % 2 === 0) ctx.fillRect(bx, bottom - barH + innerPad, w * unit, barH * 0.62);
    bx += w * unit;
  });
  ctx.font = `600 ${u(0.014)}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('$0.00', WIDTH - pad - barW / 2, bottom - innerPad * 0.7);

  const deckSize = u(COVER.deckSize);
  ctx.font = `400 ${deckSize}px ${SANS}`;
  ctx.fillStyle = 'rgba(243,244,241,0.85)';
  ctx.textAlign = 'left';
  const deck = `${personName ? `A forecast for ${personName}. ` : ''}Happiness index ${happiness}/100.`;
  const deckLines = wrapLines(deck, WIDTH - pad * 2 - barW - u(0.03), (t) => ctx.measureText(t).width);
  let y = bottom - (deckLines.length - 1) * deckSize * 1.3;
  deckLines.forEach((line, i) => ctx.fillText(line, pad, y + i * deckSize * 1.3));

  const headSize = u(headlineScale(title));
  ctx.font = `500 ${headSize}px ${SERIF}`;
  ctx.fillStyle = PAPER;
  const headLines = wrapLines(title, WIDTH - pad * 2, (t) => ctx.measureText(t).width);
  const lead = headSize * 0.98;
  // The headline sits above whichever is taller, the deck text or the
  // barcode, so a long title can never run into the barcode.
  const blockTop = Math.min(y - deckSize * 0.9, bottom - barH);
  y = blockTop - u(0.035) - (headLines.length - 1) * lead;
  headLines.forEach((line, i) => spaced(ctx, line, pad, y + i * lead, -headSize * 0.03, 'left'));

  const kickerSize = u(COVER.kickerSize);
  ctx.font = `600 ${kickerSize}px ${SANS}`;
  ctx.textAlign = 'left';
  const kickerW = ctx.measureText('Cover story').width;
  const kickerBoxH = kickerSize + u(0.01);
  const kickerTop = y - headSize * 0.82 - u(0.02) - kickerBoxH;
  ctx.fillStyle = MARK;
  ctx.fillRect(pad, kickerTop, kickerW + u(0.028), kickerBoxH);
  ctx.fillStyle = INK;
  ctx.fillText('Cover story', pad + u(0.014), kickerTop + kickerBoxH / 2 + kickerSize * 0.36);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Cover export failed'))), 'image/png');
    } catch (err) {
      // A tainted canvas (photo served without CORS) throws here. Retry
      // without the photo rather than failing the download outright.
      if (includePhoto) {
        renderCoverBlob({ title, imageUrl, personName, happiness, includePhoto: false }).then(resolve, reject);
      } else {
        reject(err);
      }
    }
  });
}
