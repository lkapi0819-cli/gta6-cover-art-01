// Fixed scenes for screenshots, read from the page's query string.
//
// ?shot=cover renders only the exported cover, filling the viewport;
// ?shot=editor shows the normal editor with a scene preloaded. The scene
// is chosen by query params: layout (a layout id from panels.js), title,
// sub, grade, photos (comma-separated sample names, cycled across the
// panels) and filters (comma-separated per-panel filter ids).

/** Parses the query string into a shot config, or null when not a shot. */
export function readShotConfig() {
  const params = new URLSearchParams(location.search);
  const mode = params.get('shot');
  if (!mode) return null;
  return {
    mode,
    layoutId: params.get('layout') ?? 'hero',
    title: params.get('title') ?? 'VICE HEAT',
    subtitle: params.get('sub') ?? '',
    grade: params.get('grade') ?? 'sunset',
    sampleNames: (params.get('photos') ?? 'pier,boulevard').split(',').filter(Boolean),
    filterIds: (params.get('filters') ?? '').split(',').filter(Boolean),
    panY: Number(params.get('pany') ?? 0.42),
  };
}

/** Marks the shot as painted after two animation frames. */
export function signalShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
