// The Vice Panel renderer: draws a whole multi-panel cover onto any canvas
// 2D context at any size, so the editor preview and the exported PNG are
// the same drawing. Photos are cover-fitted into their panels with a pan
// and zoom each; a panel with no photo gets an original code-drawn Vice
// City scene (gradient sky, sun disc, skyline, palm silhouettes) that
// varies by panel index. Colour grades are canvas-composited overlays,
// per panel and over the whole cover, followed by the caption lettering.

import { layoutById, panelRects, titleBandRect } from './panels.js';

export const PANEL_FILTERS = [
  { id: 'none', name: 'No filter' },
  { id: 'sunset', name: 'Sunset' },
  { id: 'neon', name: 'Neon' },
  { id: 'noir', name: 'Noir' },
  { id: 'chrome', name: 'Chrome' },
  { id: 'duotone', name: 'Duotone' },
];

export const GLOBAL_GRADES = [
  { id: 'sunset', name: 'Sunset grade' },
  { id: 'neon', name: 'Neon grade' },
  { id: 'noir', name: 'Noir grade' },
  { id: 'chrome', name: 'Chrome grade' },
  { id: 'none', name: 'No grade' },
];

const TITLE_FONT_STACK = '"Arial Narrow", Impact, "Helvetica Neue", sans-serif';
const SUBTITLE_FONT_STACK = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';

/** A small deterministic random source, so a scene draws the same twice. */
export function seededRandom(seed) {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Where a photo lands inside a panel: cover-fit scaled by zoom, with the
 * overflow distributed by panX / panY (0 pins the left/top edge, 1 the
 * right/bottom edge). Returns the draw rectangle in canvas pixels.
 */
export function coverFitRect(image, rect, zoom, panX, panY) {
  const scale = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight) * zoom;
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  return {
    dx: rect.x - (dw - rect.w) * panX,
    dy: rect.y - (dh - rect.h) * panY,
    dw,
    dh,
  };
}

const SCENE_PALETTES = [
  ['#2b1055', '#b83a6e', '#ff9a3d'],
  ['#0b2a4a', '#1b7f8e', '#ffd23d'],
  ['#3d0c4e', '#8e2a8e', '#ff5e8a'],
  ['#101d42', '#2a6ea6', '#7fe0d4'],
  ['#4a1030', '#c73e54', '#ffb35c'],
  ['#1d0b38', '#6e2a7f', '#ff7847'],
];

/** One palm silhouette: a curved trunk and a fan of drooping fronds. */
export function drawPalmSilhouette(ctx, baseX, baseY, scale, lean, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  const topX = baseX + lean * scale;
  const topY = baseY - scale;
  ctx.lineWidth = scale * 0.055;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + lean * scale * 0.3, baseY - scale * 0.6, topX, topY);
  ctx.stroke();
  ctx.lineWidth = scale * 0.035;
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * (0.08 + (i / 6) * 0.84);
    const reach = scale * (0.34 + (i % 3) * 0.07);
    const endX = topX - Math.cos(angle) * reach * Math.sign(lean || 1);
    const endY = topY - Math.sin(angle) * reach * 0.45 + reach * 0.34;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + (endX - topX) * 0.5, topY - reach * 0.32, endX, endY);
    ctx.stroke();
  }
}

/** The fallback art for an empty panel: sky, sun, skyline, palms, water. */
export function drawCodeDrawnScene(ctx, rect, panelIndex) {
  const palette = SCENE_PALETTES[panelIndex % SCENE_PALETTES.length];
  const rand = seededRandom(977 + panelIndex * 131);
  const sky = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sky.addColorStop(0, palette[0]);
  sky.addColorStop(0.55, palette[1]);
  sky.addColorStop(1, palette[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const sunR = Math.min(rect.w, rect.h) * 0.21;
  const sunX = rect.x + rect.w * (0.3 + rand() * 0.4);
  const sunY = rect.y + rect.h * 0.52;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  glow.addColorStop(0, 'rgba(255, 230, 160, 0.85)');
  glow.addColorStop(1, 'rgba(255, 230, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette[1];
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(rect.x, sunY + sunR * (0.18 + i * 0.3), rect.w, sunR * 0.09);
  }

  const horizon = rect.y + rect.h * 0.78;
  let bx = rect.x - rect.w * 0.04;
  while (bx < rect.x + rect.w) {
    const bw = rect.w * (0.07 + rand() * 0.11);
    const bh = rect.h * (0.1 + rand() * 0.2);
    ctx.fillStyle = 'rgba(16, 6, 32, 0.92)';
    ctx.fillRect(bx, horizon - bh, bw, bh);
    for (let wnd = 0; wnd < 4; wnd++) {
      if (rand() > 0.45) {
        ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
        ctx.fillRect(
          bx + bw * (0.15 + rand() * 0.65),
          horizon - bh + bh * (0.15 + rand() * 0.65),
          Math.max(2, bw * 0.09),
          Math.max(2, bh * 0.09),
        );
      }
    }
    bx += bw + rect.w * 0.015;
  }
  ctx.fillStyle = 'rgba(16, 6, 32, 0.92)';
  ctx.fillRect(rect.x, horizon, rect.w, rect.y + rect.h - horizon);

  const water = ctx.createLinearGradient(0, horizon, 0, rect.y + rect.h);
  water.addColorStop(0, 'rgba(255, 154, 61, 0.35)');
  water.addColorStop(1, 'rgba(20, 8, 44, 0.25)');
  ctx.fillStyle = water;
  ctx.fillRect(rect.x, horizon, rect.w, rect.y + rect.h - horizon);

  drawPalmSilhouette(ctx, rect.x + rect.w * 0.1, rect.y + rect.h * 1.01, rect.h * 0.52, 0.35, '#0d0419');
  drawPalmSilhouette(ctx, rect.x + rect.w * 0.94, rect.y + rect.h * 1.01, rect.h * 0.4, -0.3, '#0d0419');
}

/** A translucent colour wash over one rectangle, honouring a filter id. */
export function applyColourWash(ctx, rect, filterId, strength) {
  if (filterId === 'none' || strength <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (filterId === 'sunset') {
    const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    g.addColorStop(0, `rgba(255, 140, 60, ${0.3 * strength})`);
    g.addColorStop(1, `rgba(196, 30, 110, ${0.42 * strength})`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = `rgba(255, 90, 40, ${0.5 * strength})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (filterId === 'neon') {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, `rgba(40, 220, 255, ${0.34 * strength})`);
    g.addColorStop(1, `rgba(255, 40, 190, ${0.38 * strength})`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = `rgba(120, 40, 255, ${0.45 * strength})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (filterId === 'noir') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128, 128, 128, ${strength})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    g.addColorStop(0, 'rgba(235, 235, 245, 1)');
    g.addColorStop(1, `rgba(120, 120, 140, ${0.4 + 0.6 * strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (filterId === 'duotone') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128, 128, 128, ${strength})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'multiply';
    const shade = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    shade.addColorStop(0, 'rgba(255, 190, 130, 1)');
    shade.addColorStop(1, 'rgba(150, 70, 160, 1)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'screen';
    const lift = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    lift.addColorStop(0, `rgba(60, 30, 90, ${0.5 * strength})`);
    lift.addColorStop(1, `rgba(255, 120, 60, ${0.28 * strength})`);
    ctx.fillStyle = lift;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (filterId === 'chrome') {
    const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    g.addColorStop(0, `rgba(210, 235, 255, ${0.4 * strength})`);
    g.addColorStop(0.5, `rgba(120, 150, 190, ${0.16 * strength})`);
    g.addColorStop(1, `rgba(40, 60, 110, ${0.36 * strength})`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

/** The whole-cover grade: one wash across every panel and the title band. */
export function applyGlobalGrade(ctx, width, height, gradeId, strength) {
  applyColourWash(ctx, { x: 0, y: 0, w: width, h: height }, gradeId, strength * 0.8);
}

/** A soft dark edge that pulls the eye to the middle of the cover. */
export function applyVignette(ctx, width, height) {
  const r = Math.hypot(width, height) / 2;
  const g = ctx.createRadialGradient(width / 2, height / 2, r * 0.55, width / 2, height / 2, r);
  g.addColorStop(0, 'rgba(10, 2, 24, 0)');
  g.addColorStop(1, 'rgba(10, 2, 24, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

let grainTile = null;

/** Fine deterministic film grain, drawn from a fixed-seed noise tile. */
export function applyGrain(ctx, width, height) {
  if (!grainTile) {
    const tile = document.createElement('canvas');
    tile.width = 140;
    tile.height = 140;
    const tctx = tile.getContext('2d');
    const img = tctx.createImageData(140, 140);
    const rand = seededRandom(4242);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rand() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    grainTile = tile;
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Shrinks a font size until the text fits maxWidth, and returns the size. */
export function fitTitleSize(ctx, text, maxWidth, startSize, weight, stack) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${stack}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${stack}`;
  }
  return size;
}

/**
 * The caption lettering: warm gradient fill, heavy dark outline, glow.
 * Auto-fitting first shrinks the font, then squeezes the lettering
 * horizontally (down to 62%) before it would ever shrink further, which
 * keeps long titles poster-tall instead of timid.
 */
export function drawTitleText(ctx, text, cx, cy, maxWidth, startSize) {
  const size = fitTitleSize(ctx, text, maxWidth, startSize, 900, TITLE_FONT_STACK);
  ctx.font = `900 ${size}px ${TITLE_FONT_STACK}`;
  const fittedWidth = ctx.measureText(text).width;
  const squeeze = fittedWidth > maxWidth ? Math.max(0.62, maxWidth / fittedWidth) : 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(squeeze, 1);
  ctx.translate(-cx, -cy);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
  fill.addColorStop(0, '#fff3c4');
  fill.addColorStop(0.45, '#ffb35c');
  fill.addColorStop(0.75, '#ff7a4d');
  fill.addColorStop(1, '#ff4d8d');
  ctx.shadowColor = 'rgba(255, 80, 140, 0.55)';
  ctx.shadowBlur = size * 0.22;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#17062b';
  ctx.lineWidth = size * 0.17;
  ctx.strokeText(text, cx, cy);
  ctx.shadowBlur = 0;
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, cy);
  ctx.restore();
  return size;
}

/** The subtitle: letter-spaced capitals in soft white under the title. */
export function drawSubtitleText(ctx, text, cx, cy, maxWidth, startSize) {
  const spaced = text.split('').join('  ');
  const size = fitTitleSize(ctx, spaced, maxWidth, startSize, 700, SUBTITLE_FONT_STACK);
  ctx.font = `700 ${size}px ${SUBTITLE_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = size * 0.3;
  ctx.fillStyle = '#fdf6ec';
  ctx.fillText(spaced, cx, cy);
  ctx.shadowBlur = 0;
  return size;
}

/** The poster's title band: deep violet ground and a neon baseline rule. */
export function drawTitleBand(ctx, band, width) {
  const g = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  g.addColorStop(0, '#12041f');
  g.addColorStop(1, '#2b0f45');
  ctx.fillStyle = g;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  const ruleH = Math.max(3, band.h * 0.045);
  const rule = ctx.createLinearGradient(0, 0, width, 0);
  rule.addColorStop(0, '#28dcff');
  rule.addColorStop(0.5, '#ffb35c');
  rule.addColorStop(1, '#ff2896');
  ctx.fillStyle = rule;
  ctx.fillRect(0, band.y + band.h - ruleH, width, ruleH);
}

/**
 * Draws the full cover described by state onto ctx at width x height.
 * state.panels[i] is { image, panX, panY, zoom, filter } per layout panel;
 * a missing entry or a null image draws the code-drawn scene instead.
 */
export function drawCover(ctx, width, height, state) {
  const layout = layoutById(state.layoutId);
  const gutter = Math.max(4, Math.round(width * 0.007));
  ctx.fillStyle = '#f7f1e3';
  ctx.fillRect(0, 0, width, height);

  const rects = panelRects(layout, width, height);
  rects.forEach((rect, i) => {
    const inner = {
      x: rect.x + gutter / 2,
      y: rect.y + gutter / 2,
      w: rect.w - gutter,
      h: rect.h - gutter,
    };
    const panel = state.panels[i] ?? {};
    ctx.save();
    ctx.beginPath();
    ctx.rect(inner.x, inner.y, inner.w, inner.h);
    ctx.clip();
    if (panel.image) {
      const fit = coverFitRect(panel.image, inner, panel.zoom ?? 1, panel.panX ?? 0.5, panel.panY ?? 0.5);
      ctx.drawImage(panel.image, fit.dx, fit.dy, fit.dw, fit.dh);
    } else {
      drawCodeDrawnScene(ctx, inner, i);
    }
    ctx.restore();
    applyColourWash(ctx, inner, panel.filter ?? 'none', 1);
    ctx.strokeStyle = 'rgba(23, 6, 43, 0.55)';
    ctx.lineWidth = Math.max(1.5, width * 0.0016);
    ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);
  });

  applyGlobalGrade(ctx, width, height, state.grade ?? 'sunset', state.gradeStrength ?? 0.85);
  if (state.vignette) applyVignette(ctx, width, height);
  if (state.grain) applyGrain(ctx, width, height);

  const title = (state.title ?? '').trim().toUpperCase();
  const subtitle = (state.subtitle ?? '').trim().toUpperCase();
  const band = titleBandRect(layout, width, height);
  if (band) {
    drawTitleBand(ctx, band, width);
    if (title) {
      const startSize = subtitle ? band.h * 0.52 : band.h * 0.66;
      const titleY = subtitle ? band.y + band.h * 0.38 : band.y + band.h * 0.48;
      drawTitleText(ctx, title, width / 2, titleY, width * 0.93, startSize);
      if (subtitle) drawSubtitleText(ctx, subtitle, width / 2, band.y + band.h * 0.76, width * 0.9, band.h * 0.17);
    }
  } else {
    const scrimH = height * 0.34;
    const scrim = ctx.createLinearGradient(0, height - scrimH, 0, height);
    scrim.addColorStop(0, 'rgba(12, 2, 26, 0)');
    scrim.addColorStop(1, 'rgba(12, 2, 26, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, height - scrimH, width, scrimH);
    if (title) {
      drawTitleText(ctx, title, width / 2, height - height * 0.13, width * 0.93, height * 0.115);
      if (subtitle) drawSubtitleText(ctx, subtitle, width / 2, height - height * 0.045, width * 0.9, height * 0.032);
    }
  }

  if (state.showSelection && state.selectedPanel >= 0) {
    const rect = rects[state.selectedPanel];
    if (rect) {
      ctx.strokeStyle = '#28dcff';
      ctx.lineWidth = Math.max(3, width * 0.004);
      ctx.strokeRect(rect.x + gutter / 2, rect.y + gutter / 2, rect.w - gutter, rect.h - gutter);
    }
  }
}

/** Renders the cover to a fresh offscreen canvas at an export size. */
export function renderCoverCanvas(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas.getContext('2d'), width, height, { ...state, showSelection: false });
  return canvas;
}

/** Renders and downloads the cover as a PNG named for its pixel size. */
export function downloadCoverPNG(state, width, height) {
  const canvas = renderCoverCanvas(state, width, height);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panel-cover-${width}x${height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}
