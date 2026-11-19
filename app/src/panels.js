// Panel layouts for Vice Panel, the multi-panel cover art maker.
//
// Every layout is described in fractions of the whole canvas, so the same
// scene renders identically in the live preview and in an exported PNG of
// any size. A layout names where its title sits ('top' in its own band,
// 'overlay' across the foot of the art) and the panels a photo can fill.
// The renderer in cover.js insets each panel by a gutter, which leaves the
// warm white poster gutters GTA-style covers are known for.

export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero Poster',
    titlePosition: 'top',
    titleFraction: 0.18,
    panels: [
      { x: 0, y: 0.18, w: 1 / 3, h: 0.4 },
      { x: 1 / 3, y: 0.18, w: 1 / 3, h: 0.4 },
      { x: 2 / 3, y: 0.18, w: 1 / 3, h: 0.4 },
      { x: 0, y: 0.58, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0.58, w: 0.5, h: 0.42 },
    ],
  },
  {
    id: 'cover-story',
    name: 'Cover Story',
    titlePosition: 'top',
    titleFraction: 0.16,
    panels: [
      { x: 0, y: 0.16, w: 0.52, h: 0.58 },
      { x: 0.52, y: 0.16, w: 0.48, h: 0.29 },
      { x: 0.52, y: 0.45, w: 0.48, h: 0.29 },
      { x: 0, y: 0.74, w: 1, h: 0.26 },
    ],
  },
  {
    id: 'duo',
    name: 'Duo Split',
    titlePosition: 'top',
    titleFraction: 0.16,
    panels: [
      { x: 0, y: 0.16, w: 0.5, h: 0.84 },
      { x: 0.5, y: 0.16, w: 0.5, h: 0.84 },
    ],
  },
  {
    id: 'quad',
    name: 'Quad Grid',
    titlePosition: 'top',
    titleFraction: 0.16,
    panels: [
      { x: 0, y: 0.16, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0.16, w: 0.5, h: 0.42 },
      { x: 0, y: 0.58, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0.58, w: 0.5, h: 0.42 },
    ],
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    titlePosition: 'overlay',
    titleFraction: 0,
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
];

/** The layout with this id, or the Hero Poster when the id is unknown. */
export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}

/** A layout's panel rectangles in pixels for a canvas of width x height. */
export function panelRects(layout, width, height) {
  return layout.panels.map((panel) => ({
    x: panel.x * width,
    y: panel.y * height,
    w: panel.w * width,
    h: panel.h * height,
  }));
}

/** The title band's rectangle in pixels, or null for an overlay title. */
export function titleBandRect(layout, width, height) {
  if (layout.titlePosition !== 'top') return null;
  return { x: 0, y: 0, w: width, h: layout.titleFraction * height };
}

/** The index of the panel under a canvas point, or -1 when none is hit. */
export function panelIndexAt(layout, width, height, px, py) {
  const rects = panelRects(layout, width, height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
