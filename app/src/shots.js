// Fixed scenes for screenshots, driven by the page's query string.
//
//   ?shot=cover&layout=showcase&title=VICE%20HEAT&sub=...&grade=0.75
//     &panels=boulevard2:sunset:0:0:1,pier:sunset:0.1:0:1.05,...
//   ?shot=editor&layout=coverstory&title=COVER%20STORY&panels=...
//
// Each panels entry is src:filter:panX:panY:zoom, src being a sample key
// (pier, boulevard, neon, boulevard2) or "empty". shot=cover hides the
// editor chrome (see body.shot-cover in style.css) so the page is exactly
// the exported cover; shot=editor loads the same scene into the editor.
// window.__shotReady flips true once the scene has painted.

export function parseShotParams() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('shot');
  if (!mode) return null;
  return {
    mode,
    layout: q.get('layout') || null,
    title: q.has('title') ? q.get('title') : null,
    subtitle: q.has('sub') ? q.get('sub') : null,
    grade: q.has('grade') ? Number(q.get('grade')) : null,
    grain: q.get('grain') !== '0',
    vignette: q.get('vignette') !== '0',
    panels: parsePanelSpec(q.get('panels')),
  };
}

function parsePanelSpec(text) {
  if (!text) return null;
  return text.split(',').map((part) => {
    const [src, filter, panX, panY, zoom] = part.split(':');
    return {
      src: src && src !== 'empty' ? src : null,
      filter: filter || 'none',
      panX: Number(panX) || 0,
      panY: Number(panY) || 0,
      zoom: Number(zoom) || 1,
    };
  });
}

export function markShotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
