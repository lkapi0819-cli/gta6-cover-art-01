// Vice Panel v2 editor.
//
// Loads the bundled samples, wires every control on the page and keeps one
// scene object that cover.js renders — live on the preview canvas, and at
// full size for the three PNG exports. Photos are read from the person's own
// machine with object URLs and never leave it.

import { LAYOUTS, layoutById, panelRects, panelAt } from './panels.js';
import { FILTERS, drawCover, gutterFor, renderCoverCanvas } from './cover.js';
import { parseShotParams, markShotReady } from './shots.js';

const SAMPLES = [
  { key: 'pier', label: 'Pier' },
  { key: 'boulevard', label: 'Boulevard' },
  { key: 'neon', label: 'Neon St.' },
  { key: 'boulevard2', label: 'Golden Hr' },
];

// The composition the editor opens with: the Showcase cover from the brief.
const OPENING_PANELS = [
  { src: 'boulevard2', filter: 'sunset', panX: 0, panY: 0, zoom: 1 },
  { src: 'pier', filter: 'sunset', panX: 0.1, panY: 0, zoom: 1.05 },
  { src: 'neon', filter: 'neon', panX: 0, panY: 0, zoom: 1 },
  { src: 'boulevard', filter: 'chrome', panX: 0, panY: 0.05, zoom: 1.1 },
  { src: 'boulevard', filter: 'sunset', panX: -0.15, panY: 0.55, zoom: 1.3 },
  { src: 'pier', filter: 'duotone', panX: 0.3, panY: 0.5, zoom: 1.15 },
];

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const els = {
  layoutChips: document.getElementById('layoutChips'),
  filterChips: document.getElementById('filterChips'),
  tray: document.getElementById('tray'),
  photoInput: document.getElementById('photoInput'),
  title: document.getElementById('titleInput'),
  sub: document.getElementById('subInput'),
  panelLabel: document.getElementById('panelLabel'),
  zoom: document.getElementById('zoomRange'),
  grade: document.getElementById('gradeRange'),
  grain: document.getElementById('grainToggle'),
  vignette: document.getElementById('vignetteToggle'),
  status: document.getElementById('status'),
  swap: document.getElementById('swapBtn'),
};

const sources = []; // { key, label, img }
const state = {
  layoutId: 'showcase',
  title: els.title.value,
  subtitle: els.sub.value,
  grade: 0.7,
  grain: true,
  vignette: true,
  selected: 0,
  pickedSource: -1,
  swapArmed: false,
  swapFirst: -1,
  slots: [],
};

function blankSlot() {
  return { source: -1, panX: 0, panY: 0, zoom: 1, filter: 'sunset' };
}

function layout() {
  return layoutById(state.layoutId);
}

function resetSlots(keepExisting) {
  const old = state.slots;
  state.slots = layout().panels.map((_, i) => (keepExisting && old[i] ? { ...old[i] } : blankSlot()));
  state.selected = Math.min(state.selected, state.slots.length - 1);
  state.swapFirst = -1;
}

function sourceIndexByKey(key) {
  return sources.findIndex((s) => s.key === key);
}

// Applies a [{src, filter, panX, panY, zoom}] spec to the current layout.
function applyPanelSpec(spec) {
  spec.forEach((p, i) => {
    if (!state.slots[i]) return;
    state.slots[i] = {
      source: p.src ? sourceIndexByKey(p.src) : -1,
      filter: p.filter || 'none',
      panX: p.panX || 0,
      panY: p.panY || 0,
      zoom: p.zoom || 1,
    };
  });
}

function scene() {
  return {
    layout: layout(),
    title: state.title,
    subtitle: state.subtitle,
    grade: state.grade,
    grain: state.grain,
    vignette: state.vignette,
    slots: state.slots.map((s) => ({
      image: s.source >= 0 ? sources[s.source].img : null,
      panX: s.panX,
      panY: s.panY,
      zoom: s.zoom,
      filter: s.filter,
    })),
  };
}

function redraw() {
  drawCover(ctx, canvas.width, canvas.height, scene());
  if (!document.body.classList.contains('shot-cover')) drawSelection();
}

function drawSelection() {
  const gutter = gutterFor(canvas.width, canvas.height);
  const { rects } = panelRects(layout(), canvas.width, canvas.height, gutter);
  const r = rects[state.selected];
  if (!r) return;
  ctx.save();
  ctx.strokeStyle = state.swapArmed ? '#f0c76a' : '#22d3ee';
  ctx.lineWidth = 3;
  ctx.setLineDash([11, 8]);
  ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
  ctx.restore();
}

function setStatus(text) {
  els.status.textContent = text;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// ---- control builders ------------------------------------------------------

function buildLayoutChips() {
  els.layoutChips.innerHTML = '';
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (l.id === state.layoutId ? ' active' : '');
    b.textContent = l.label;
    b.addEventListener('click', () => {
      state.layoutId = l.id;
      resetSlots(true);
      buildLayoutChips();
      syncPanelControls();
      redraw();
    });
    els.layoutChips.appendChild(b);
  }
}

function buildFilterChips() {
  els.filterChips.innerHTML = '';
  const slot = state.slots[state.selected];
  for (const f of FILTERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (slot && slot.filter === f.id ? ' active' : '');
    b.textContent = f.label;
    b.addEventListener('click', () => {
      if (!state.slots[state.selected]) return;
      state.slots[state.selected].filter = f.id;
      buildFilterChips();
      redraw();
    });
    els.filterChips.appendChild(b);
  }
}

function buildTray() {
  els.tray.innerHTML = '';
  sources.forEach((s, i) => {
    const fig = document.createElement('figure');
    fig.className = state.pickedSource === i ? 'picked' : '';
    const img = document.createElement('img');
    img.src = s.img.src;
    img.alt = s.label;
    const cap = document.createElement('figcaption');
    cap.textContent = s.label;
    fig.append(img, cap);
    fig.addEventListener('click', () => {
      state.pickedSource = i;
      if (state.slots[state.selected]) state.slots[state.selected].source = i;
      buildTray();
      redraw();
    });
    els.tray.appendChild(fig);
  });
}

function syncPanelControls() {
  const slot = state.slots[state.selected];
  els.panelLabel.textContent = slot
    ? `Panel ${state.selected + 1} of ${state.slots.length}${slot.source >= 0 ? ` — ${sources[slot.source].label}` : ' — painted scene'}`
    : 'No panel selected';
  els.zoom.value = slot ? slot.zoom : 1;
  buildFilterChips();
}

// ---- exports -----------------------------------------------------------------

function downloadPNG(w, h, name) {
  renderCoverCanvas(scene(), w, h).toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus(`Saved ${name}`);
  }, 'image/png');
}

// ---- wiring --------------------------------------------------------------------

function wireControls() {
  els.title.addEventListener('input', () => { state.title = els.title.value; redraw(); });
  els.sub.addEventListener('input', () => { state.subtitle = els.sub.value; redraw(); });
  els.grade.addEventListener('input', () => { state.grade = Number(els.grade.value) / 100; redraw(); });
  els.grain.addEventListener('change', () => { state.grain = els.grain.checked; redraw(); });
  els.vignette.addEventListener('change', () => { state.vignette = els.vignette.checked; redraw(); });
  els.zoom.addEventListener('input', () => {
    const slot = state.slots[state.selected];
    if (!slot) return;
    slot.zoom = Number(els.zoom.value);
    redraw();
  });
  document.getElementById('clearPanelBtn').addEventListener('click', () => {
    const slot = state.slots[state.selected];
    if (!slot) return;
    slot.source = -1;
    syncPanelControls();
    redraw();
  });
  document.getElementById('shuffleBtn').addEventListener('click', () => {
    if (!sources.length) return;
    for (const slot of state.slots) {
      slot.source = Math.floor(Math.random() * sources.length);
      slot.panX = (Math.random() - 0.5) * 0.5;
      slot.panY = (Math.random() - 0.5) * 0.3;
    }
    syncPanelControls();
    redraw();
    setStatus('Panels shuffled');
  });
  els.swap.addEventListener('click', () => {
    state.swapArmed = !state.swapArmed;
    state.swapFirst = -1;
    els.swap.classList.toggle('armed', state.swapArmed);
    els.swap.setAttribute('aria-pressed', String(state.swapArmed));
    canvas.classList.toggle('swap-armed', state.swapArmed);
    setStatus(state.swapArmed ? 'Swap: click the first panel' : '');
    redraw();
  });
  els.photoInput.addEventListener('change', async () => {
    const files = [...els.photoInput.files];
    for (const file of files) {
      const img = await loadImage(URL.createObjectURL(file));
      sources.push({ key: 'upload', label: file.name.replace(/\.[^.]+$/, '').slice(0, 14), img });
    }
    buildTray();
    setStatus(files.length ? `Added ${files.length} photo${files.length > 1 ? 's' : ''}` : '');
  });
  document.getElementById('exportSquare').addEventListener('click', () => downloadPNG(1080, 1080, 'vice-panel-1080x1080.png'));
  document.getElementById('exportPortrait').addEventListener('click', () => downloadPNG(1080, 1350, 'vice-panel-1080x1350.png'));
  document.getElementById('exportWide').addEventListener('click', () => downloadPNG(1920, 1080, 'vice-panel-1920x1080.png'));
}

function wireCanvas() {
  let drag = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const gutter = gutterFor(canvas.width, canvas.height);
    const idx = panelAt(layout(), canvas.width, canvas.height, gutter, p.x, p.y);
    if (idx < 0) return;
    if (state.swapArmed) {
      if (state.swapFirst < 0) {
        state.swapFirst = idx;
        state.selected = idx;
        setStatus('Swap: click the second panel');
      } else {
        const a = state.slots[state.swapFirst];
        state.slots[state.swapFirst] = state.slots[idx];
        state.slots[idx] = a;
        state.swapFirst = -1;
        state.selected = idx;
        setStatus('Panels swapped');
      }
      syncPanelControls();
      redraw();
      return;
    }
    state.selected = idx;
    if (state.pickedSource >= 0) {
      state.slots[idx].source = state.pickedSource;
      state.pickedSource = -1;
      buildTray();
    }
    const slot = state.slots[idx];
    drag = { x: p.x, y: p.y, panX: slot.panX, panY: slot.panY };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
    syncPanelControls();
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCanvas(e);
    const slot = state.slots[state.selected];
    const gutter = gutterFor(canvas.width, canvas.height);
    const { rects } = panelRects(layout(), canvas.width, canvas.height, gutter);
    const r = rects[state.selected];
    slot.panX = Math.max(-1, Math.min(1, drag.panX + ((p.x - drag.x) / r.w) * 1.7 / slot.zoom));
    slot.panY = Math.max(-1, Math.min(1, drag.panY + ((p.y - drag.y) / r.h) * 1.7 / slot.zoom));
    redraw();
  });
  const endDrag = () => {
    drag = null;
    canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.slots[state.selected];
    if (!slot) return;
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * (e.deltaY < 0 ? 1.07 : 0.93)));
    els.zoom.value = slot.zoom;
    redraw();
  }, { passive: false });
}

// ---- boot ------------------------------------------------------------------------

async function init() {
  resetSlots(false);
  buildLayoutChips();
  wireControls();
  wireCanvas();
  for (const s of SAMPLES) {
    const img = await loadImage(`samples/${s.key}.jpg`);
    sources.push({ ...s, img });
  }
  buildTray();
  applyPanelSpec(OPENING_PANELS);

  const shot = parseShotParams();
  if (shot) {
    if (shot.layout) {
      state.layoutId = shot.layout;
      resetSlots(false);
      buildLayoutChips();
    }
    if (shot.title !== null) { state.title = shot.title; els.title.value = shot.title; }
    if (shot.subtitle !== null) { state.subtitle = shot.subtitle; els.sub.value = shot.subtitle; }
    if (shot.grade !== null) { state.grade = shot.grade; els.grade.value = Math.round(shot.grade * 100); }
    state.grain = shot.grain;
    state.vignette = shot.vignette;
    els.grain.checked = shot.grain;
    els.vignette.checked = shot.vignette;
    if (shot.panels) applyPanelSpec(shot.panels);
    if (shot.mode === 'cover') {
      document.body.classList.add('shot-cover');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }
  syncPanelControls();
  redraw();
  if (shot) markShotReady();
}

window.__vicePanel = {
  exportPNG: (w, h) => renderCoverCanvas(scene(), w, h).toDataURL('image/png'),
  state: () => JSON.parse(JSON.stringify({
    layoutId: state.layoutId,
    title: state.title,
    subtitle: state.subtitle,
    grade: state.grade,
    grain: state.grain,
    vignette: state.vignette,
    selected: state.selected,
    sources: sources.map((s) => s.label),
    slots: state.slots,
  })),
};

init().catch((err) => setStatus(`Could not start: ${err.message}`));
