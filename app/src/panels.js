// Panel layouts for Vice Panel v2.
//
// Every layout is described in fractions so the same composition renders at
// the editor's preview size and at each export size. `band` is the fraction
// of the canvas height reserved for the title block at the top; the panels
// tile the area below it, and each panel rect is a fraction of that area.
// A band of 0 means the title is overlaid on the art itself (Full Bleed).

export const LAYOUTS = [
  {
    id: 'showcase',
    label: 'Showcase',
    band: 0.155,
    panels: [
      { x: 0, y: 0, w: 1, h: 0.38 },
      { x: 0, y: 0.38, w: 1 / 3, h: 0.32 },
      { x: 1 / 3, y: 0.38, w: 1 / 3, h: 0.32 },
      { x: 2 / 3, y: 0.38, w: 1 / 3, h: 0.32 },
      { x: 0, y: 0.70, w: 0.5, h: 0.30 },
      { x: 0.5, y: 0.70, w: 0.5, h: 0.30 },
    ],
  },
  {
    id: 'hero',
    label: 'Hero Poster',
    band: 0.16,
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 0.48 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 0.48 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.48 },
      { x: 0, y: 0.48, w: 0.5, h: 0.52 },
      { x: 0.5, y: 0.48, w: 0.5, h: 0.52 },
    ],
  },
  {
    id: 'coverstory',
    label: 'Cover Story',
    band: 0.15,
    panels: [
      { x: 0, y: 0, w: 0.55, h: 0.70 },
      { x: 0.55, y: 0, w: 0.45, h: 0.70 },
      { x: 0, y: 0.70, w: 1, h: 0.30 },
    ],
  },
  {
    id: 'duo',
    label: 'Duo Split',
    band: 0.145,
    panels: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: 'quad',
    label: 'Quad Grid',
    band: 0.15,
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'fullbleed',
    label: 'Full Bleed',
    band: 0,
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

// Pixel rects for a layout on a canvas of w x h, with `gutter` px of poster
// paper showing between panels. Returns { bandH, rects: [{x,y,w,h}...] }.
export function panelRects(layout, w, h, gutter) {
  const bandH = Math.round(h * layout.band);
  const areaH = h - bandH;
  const rects = layout.panels.map((p) => {
    const x = p.x * w;
    const y = bandH + p.y * areaH;
    const pw = p.w * w;
    const ph = p.h * areaH;
    const gx = p.x === 0 ? gutter : gutter / 2;
    const gy = p.y === 0 ? gutter : gutter / 2;
    const gw = p.x + p.w >= 1 ? gutter : gutter / 2;
    const gh = p.y + p.h >= 1 ? gutter : gutter / 2;
    return { x: x + gx, y: y + gy, w: pw - gx - gw, h: ph - gy - gh };
  });
  return { bandH, rects };
}

// Index of the panel under a canvas point, or -1 (title band / gutter).
export function panelAt(layout, w, h, gutter, px, py) {
  const { rects } = panelRects(layout, w, h, gutter);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
