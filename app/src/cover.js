// The Vice Panel v2 renderer.
//
// A scene is { layout, title, subtitle, grade, grain, vignette, slots } and
// each slot is { image, panX, panY, zoom, filter }: an image (or null for a
// painted scene), a pan in -1..1, a zoom of 1..3 and a filter id. Everything
// is drawn with canvas gradients and shapes — no assets, no network — so the
// same scene renders identically in the editor and in an exported PNG.

import { panelRects } from './panels.js';

export const FILTERS = [
  { id: 'none', label: 'None' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'neon', label: 'Neon' },
  { id: 'noir', label: 'Noir' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'duotone', label: 'Duotone' },
];

const FILTER_CSS = {
  none: '',
  sunset: 'saturate(1.35) contrast(1.06) brightness(1.02)',
  neon: 'saturate(1.7) contrast(1.12) brightness(1.03)',
  noir: 'grayscale(1) contrast(1.25) brightness(0.97)',
  chrome: 'saturate(0.8) contrast(1.18) brightness(1.07)',
  duotone: 'grayscale(1) contrast(1.14) brightness(1.04)',
};

export function gutterFor(w, h) {
  return Math.max(6, Math.round(Math.min(w, h) * 0.011));
}

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(ctx, x, y, w, h, stops, horizontal = false) {
  const g = horizontal
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

// ---- painted fallback scenes for panels with no photo --------------------

function paintPalmSilhouette(ctx, x, baseY, hgt, lean, col) {
  const topX = x + lean * hgt * 0.3;
  const topY = baseY - hgt;
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, hgt * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * hgt * 0.12, baseY - hgt * 0.55, topX, topY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.6, hgt * 0.028);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const ang = Math.PI * (0.08 + 0.84 * t);
    const len = hgt * 0.34;
    const ex = topX + Math.cos(ang) * len;
    const ey = topY - Math.sin(ang) * len * 0.35 + len * 0.34;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(ang) * len * 0.55, topY - Math.sin(ang) * len * 0.5, ex, ey);
    ctx.stroke();
  }
}

function paintSkyline(ctx, x, baseY, w, hgt, col, seed) {
  const rnd = mulberry(seed);
  ctx.fillStyle = col;
  let cx = x - 6;
  while (cx < x + w + 6) {
    const bw = w * (0.06 + rnd() * 0.10);
    const bh = hgt * (0.35 + rnd() * 0.65);
    ctx.fillRect(cx, baseY - bh, bw, bh);
    cx += bw + w * 0.012 + rnd() * w * 0.02;
  }
}

// One of three painted scenes, chosen by the panel index, for empty slots.
export function paintFallbackScene(ctx, rect, slotIndex) {
  const { x, y, w, h } = rect;
  const variant = slotIndex % 3;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (variant === 0) {
    // sunset boulevard
    shade(ctx, x, y, w, h, [[0, '#38195e'], [0.45, '#c73e63'], [0.72, '#ff8a4d'], [1, '#5c1e42']]);
    const sg = ctx.createRadialGradient(x + w * 0.62, y + h * 0.62, 4, x + w * 0.62, y + h * 0.62, w * 0.42);
    sg.addColorStop(0, 'rgba(255,225,160,0.95)');
    sg.addColorStop(0.25, 'rgba(255,170,90,0.55)');
    sg.addColorStop(1, 'rgba(255,140,80,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffedb5';
    ctx.beginPath(); ctx.arc(x + w * 0.62, y + h * 0.62, w * 0.075, 0, Math.PI * 2); ctx.fill();
    paintSkyline(ctx, x, y + h * 0.78, w, h * 0.30, '#401336', 900 + slotIndex);
    shade(ctx, x, y + h * 0.78, w, h * 0.22, [[0, 'rgba(40,8,36,0.55)'], [1, 'rgba(16,2,20,0.92)']]);
    paintPalmSilhouette(ctx, x + w * 0.16, y + h * 0.86, h * 0.44, -0.4, '#1c0518');
    paintPalmSilhouette(ctx, x + w * 0.88, y + h * 0.88, h * 0.36, 0.5, '#1c0518');
  } else if (variant === 1) {
    // neon street
    shade(ctx, x, y, w, h, [[0, '#05061a'], [0.6, '#18104a'], [1, '#03030c']]);
    const rnd = mulberry(400 + slotIndex);
    ctx.fillStyle = '#d7ecff';
    for (let i = 0; i < 40; i++) {
      ctx.globalAlpha = 0.3 + rnd() * 0.7;
      ctx.fillRect(x + rnd() * w, y + rnd() * h * 0.4, 2, 2);
    }
    ctx.globalAlpha = 1;
    paintSkyline(ctx, x, y + h * 0.74, w, h * 0.34, '#0a0724', 300 + slotIndex);
    // glowing sign bars
    const signs = ['#ff2e88', '#22d3ee', '#ffb347', '#c084fc'];
    for (let i = 0; i < 4; i++) {
      const sx = x + w * (0.10 + i * 0.22);
      const sy = y + h * (0.16 + (i % 2) * 0.13);
      ctx.save();
      ctx.shadowColor = signs[i];
      ctx.shadowBlur = 18;
      ctx.strokeStyle = signs[i];
      ctx.lineWidth = 3;
      ctx.strokeRect(sx, sy, w * 0.13, h * 0.05);
      ctx.restore();
    }
    shade(ctx, x, y + h * 0.74, w, h * 0.26, [[0, 'rgba(30,20,90,0.35)'], [1, 'rgba(2,2,10,0.95)']]);
    paintPalmSilhouette(ctx, x + w * 0.10, y + h * 0.82, h * 0.34, -0.5, '#01010a');
    paintPalmSilhouette(ctx, x + w * 0.94, y + h * 0.84, h * 0.28, 0.5, '#01010a');
  } else {
    // dusk beach
    shade(ctx, x, y, w, h, [[0, '#1d2a5e'], [0.5, '#7a3a72'], [0.75, '#ff9a5c'], [1, '#2c1240']]);
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath(); ctx.arc(x + w * 0.34, y + h * 0.68, w * 0.06, 0, Math.PI * 2); ctx.fill();
    // sea band with a sun path
    shade(ctx, x, y + h * 0.68, w, h * 0.14, [[0, 'rgba(255,170,100,0.75)'], [1, 'rgba(90,40,110,0.9)']]);
    ctx.fillStyle = 'rgba(255,240,200,0.8)';
    const rnd = mulberry(600 + slotIndex);
    for (let i = 0; i < 12; i++) {
      const lw = w * (0.03 + rnd() * 0.08);
      ctx.fillRect(x + w * 0.34 - lw / 2 + (rnd() - 0.5) * w * 0.05, y + h * (0.695 + i * 0.0105), lw, 2);
    }
    shade(ctx, x, y + h * 0.82, w, h * 0.18, [[0, '#59305e'], [1, '#22102e']]);
    paintPalmSilhouette(ctx, x + w * 0.82, y + h * 0.92, h * 0.5, 0.35, '#17041c');
    paintPalmSilhouette(ctx, x + w * 0.08, y + h * 0.90, h * 0.38, -0.3, '#17041c');
  }
  ctx.restore();
}

// ---- per-panel photo treatment -------------------------------------------

let scratch = null;
function scratchCanvas(w, h) {
  if (!scratch) scratch = document.createElement('canvas');
  scratch.width = Math.max(2, Math.round(w));
  scratch.height = Math.max(2, Math.round(h));
  return scratch;
}

function drawPanelImage(ctx, rect, slot) {
  const { x, y, w, h } = rect;
  const img = slot.image;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (slot.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2 + (slot.panX || 0) * ((dw - w) / 2);
  const dy = y + (h - dh) / 2 + (slot.panY || 0) * ((dh - h) / 2);
  const filter = slot.filter || 'none';

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (filter === 'duotone') {
    // Paint the grey image to a scratch canvas, then map its tones onto a
    // violet-to-pink ramp with multiply/screen passes inside the panel.
    const sc = scratchCanvas(w, h);
    const sctx = sc.getContext('2d');
    sctx.save();
    sctx.filter = FILTER_CSS.duotone;
    sctx.drawImage(img, dx - x, dy - y, dw, dh);
    sctx.restore();
    ctx.drawImage(sc, x, y);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#8a7bd8';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#5c1030';
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    if (FILTER_CSS[filter]) ctx.filter = FILTER_CSS[filter];
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    if (filter === 'sunset') {
      ctx.globalCompositeOperation = 'soft-light';
      shade(ctx, x, y, w, h, [[0, 'rgba(255,90,140,0.85)'], [0.55, 'rgba(255,140,70,0.35)'], [1, 'rgba(255,90,40,0.95)']]);
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.35;
      shade(ctx, x, y + h * 0.45, w, h * 0.55, [[0, 'rgba(255,110,50,0)'], [1, 'rgba(255,80,60,0.8)']]);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else if (filter === 'neon') {
      ctx.globalCompositeOperation = 'overlay';
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, 'rgba(34,211,238,0.55)');
      g.addColorStop(0.5, 'rgba(120,60,255,0.18)');
      g.addColorStop(1, 'rgba(255,46,136,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'source-over';
    } else if (filter === 'noir') {
      ctx.globalCompositeOperation = 'multiply';
      shade(ctx, x, y, w, h, [[0, 'rgba(255,255,255,0.92)'], [0.7, 'rgba(230,230,230,0.95)'], [1, 'rgba(120,120,120,1)']]);
      ctx.globalCompositeOperation = 'source-over';
    } else if (filter === 'chrome') {
      ctx.globalCompositeOperation = 'overlay';
      shade(ctx, x, y, w, h, [[0, 'rgba(190,220,255,0.6)'], [0.5, 'rgba(120,140,200,0.12)'], [1, 'rgba(40,60,140,0.5)']]);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
}

// ---- whole-cover finishing ------------------------------------------------

let noiseTile = null;
function grainTile() {
  if (noiseTile) return noiseTile;
  noiseTile = document.createElement('canvas');
  noiseTile.width = 140;
  noiseTile.height = 140;
  const nctx = noiseTile.getContext('2d');
  const img = nctx.createImageData(140, 140);
  const rnd = mulberry(4242);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(rnd() * 128);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  return noiseTile;
}

function drawTitleBlock(ctx, w, h, bandH, scene) {
  const overlay = bandH === 0;
  const blockH = overlay ? h * 0.30 : bandH;
  if (overlay) {
    shade(ctx, 0, 0, w, blockH, [[0, 'rgba(6,2,18,0.78)'], [0.75, 'rgba(6,2,18,0.35)'], [1, 'rgba(6,2,18,0)']]);
  } else {
    shade(ctx, 0, 0, w, bandH, [[0, '#1a0b31'], [0.7, '#120626'], [1, '#0a0418']]);
    const glow = ctx.createRadialGradient(w / 2, bandH * 0.42, 6, w / 2, bandH * 0.42, w * 0.42);
    glow.addColorStop(0, 'rgba(255,46,136,0.28)');
    glow.addColorStop(1, 'rgba(255,46,136,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, bandH);
  }

  const title = (scene.title || '').trim().toUpperCase();
  const sub = (scene.subtitle || '').trim().toUpperCase();
  const margin = w * 0.045;

  // Edition chip: a corner badge at the poster's bottom right, clear of
  // the title no matter how wide the lettering runs.
  const chipText = 'VOL. 01 · LEONIDA';
  const chipFont = Math.max(10, blockH * 0.105);
  ctx.font = `700 ${chipFont}px 'Arial Narrow', Arial, sans-serif`;
  const chipW = ctx.measureText(chipText).width + chipFont * 2.6;
  const chipH = chipFont * 1.9;
  const chipX = w - margin - chipW;
  const chipY = h - margin - chipH;
  ctx.save();
  ctx.fillStyle = 'rgba(8,3,22,0.6)';
  ctx.strokeStyle = 'rgba(240,199,106,0.9)';
  ctx.lineWidth = Math.max(1, chipFont * 0.09);
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f0c76a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${chipFont * 0.18}px`; } catch { /* older engines */ }
  ctx.fillText(chipText, chipX + chipW / 2, chipY + chipH / 2 + 1);
  ctx.restore();

  if (!title) return;
  // Display lettering: shrink to fit, tight tracking, two-tone gradient
  // fill, a heavy ink outline and a soft neon halo behind it.
  let size = blockH * (overlay ? 0.34 : 0.46);
  const setFont = () => {
    ctx.font = `900 ${size}px Impact, 'Arial Black', 'Franklin Gothic Heavy', Arial, sans-serif`;
    try { ctx.letterSpacing = `${-size * 0.012}px`; } catch { /* older engines */ }
  };
  setFont();
  while (ctx.measureText(title).width > w * 0.90 && size > 14) {
    size -= 2;
    setFont();
  }
  const titleY = overlay ? blockH * 0.40 : bandH * 0.40;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = 'rgba(255,46,136,0.85)';
  ctx.shadowBlur = size * 0.38;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.17;
  ctx.strokeStyle = '#150722';
  ctx.strokeText(title, w / 2, titleY);
  const tg = ctx.createLinearGradient(0, titleY - size * 0.55, 0, titleY + size * 0.55);
  tg.addColorStop(0, '#ffd76a');
  tg.addColorStop(0.42, '#ff8a3d');
  tg.addColorStop(0.78, '#ff3d68');
  tg.addColorStop(1, '#ff2e88');
  ctx.fillStyle = tg;
  ctx.fillText(title, w / 2, titleY);
  ctx.shadowBlur = 0;
  ctx.fillText(title, w / 2, titleY);
  ctx.restore();

  if (sub) {
    const subSize = Math.max(11, size * 0.21);
    ctx.font = `600 ${subSize}px 'Arial Narrow', Arial, sans-serif`;
    try { ctx.letterSpacing = `${subSize * 0.52}px`; } catch { /* older engines */ }
    ctx.fillStyle = '#ffe9c4';
    ctx.fillText(sub, w / 2, titleY + size * 0.52 + subSize * 0.85);
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  }

  // The thin gold rule under the title block.
  const ruleY = (overlay ? blockH * 0.80 : bandH * 0.865);
  const ruleW = w * 0.56;
  const rg = ctx.createLinearGradient(w / 2 - ruleW / 2, 0, w / 2 + ruleW / 2, 0);
  rg.addColorStop(0, 'rgba(240,199,106,0)');
  rg.addColorStop(0.18, 'rgba(240,199,106,0.95)');
  rg.addColorStop(0.82, 'rgba(240,199,106,0.95)');
  rg.addColorStop(1, 'rgba(240,199,106,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(w / 2 - ruleW / 2, ruleY, ruleW, Math.max(2, h * 0.0032));
}

// Draws the whole cover onto ctx at w x h.
export function drawCover(ctx, w, h, scene) {
  const layout = scene.layout;
  const gutter = gutterFor(w, h);
  const { bandH, rects } = panelRects(layout, w, h, gutter);

  // Poster paper behind the panels.
  ctx.fillStyle = '#f4ecda';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((rect, i) => {
    const slot = scene.slots[i] ?? { image: null, panX: 0, panY: 0, zoom: 1, filter: 'none' };
    if (slot.image) drawPanelImage(ctx, rect, slot);
    else paintFallbackScene(ctx, rect, i);
    ctx.strokeStyle = 'rgba(20,8,30,0.22)';
    ctx.lineWidth = Math.max(1, gutter * 0.14);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Global colour grade over the art (never over the title block).
  const grade = scene.grade ?? 0;
  if (grade > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, bandH, w, h - bandH);
    ctx.clip();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.5 * grade;
    shade(ctx, 0, bandH, w, h - bandH, [[0, 'rgba(255,130,80,0.35)'], [0.55, 'rgba(255,70,120,0.30)'], [1, 'rgba(140,40,180,0.55)']]);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'soft-light';
    shade(ctx, 0, bandH, w, h - bandH, [[0, 'rgba(255,190,90,0.8)'], [1, 'rgba(255,40,120,0.8)']]);
    ctx.restore();
  }

  if (scene.grain) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (scene.vignette) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.74);
    vg.addColorStop(0, 'rgba(6,0,14,0)');
    vg.addColorStop(1, 'rgba(6,0,14,0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  drawTitleBlock(ctx, w, h, bandH, scene);
}

// Renders a scene to a fresh canvas at an exact size (used for exports).
export function renderCoverCanvas(scene, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, scene);
  return canvas;
}

export function exportPNGDataURL(scene, w, h) {
  return renderCoverCanvas(scene, w, h).toDataURL('image/png');
}
