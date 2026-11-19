// Vice Panel editor wiring: photos in, panels filled, caption set, PNG out.
//
// A person's photos are read on their own machine (file input or the two
// bundled samples) and kept in a tray. Each layout panel holds one photo
// with its own pan, zoom and filter; clicking a panel in the live preview
// selects it, dragging pans its photo, and the wheel zooms it. Three
// export buttons render the same scene at the common post sizes.

import { LAYOUTS, layoutById, panelIndexAt } from './panels.js';
import { PANEL_FILTERS, GLOBAL_GRADES, drawCover, downloadCoverPNG, coverFitRect } from './cover.js';
import { readShotConfig, signalShotReady } from './shots.js';

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('tray');

const editor = {
  layoutId: 'hero',
  title: 'VICE HEAT',
  subtitle: 'SUNSET CITY STORIES',
  grade: 'sunset',
  gradeStrength: 0.85,
  grain: true,
  vignette: true,
  photos: [],
  photoNames: [],
  panelStatesByLayout: new Map(),
  selectedPanel: 0,
  shotCoverMode: false,
};

/** A fresh editable state for one panel. */
export function emptyPanelState() {
  return { photoIndex: -1, panX: 0.5, panY: 0.5, zoom: 1, filter: 'none' };
}

/** The panel states for the current layout, created on first use. */
export function currentPanelStates() {
  let states = editor.panelStatesByLayout.get(editor.layoutId);
  const count = layoutById(editor.layoutId).panels.length;
  if (!states) {
    states = Array.from({ length: count }, emptyPanelState);
    editor.panelStatesByLayout.set(editor.layoutId, states);
  }
  while (states.length < count) states.push(emptyPanelState());
  return states;
}

/** The renderer state: panel states with their photos resolved. */
export function buildRenderState(forExport) {
  const states = currentPanelStates();
  return {
    layoutId: editor.layoutId,
    title: editor.title,
    subtitle: editor.subtitle,
    grade: editor.grade,
    gradeStrength: editor.gradeStrength,
    grain: editor.grain,
    vignette: editor.vignette,
    selectedPanel: editor.selectedPanel,
    showSelection: !forExport && !editor.shotCoverMode,
    panels: states.map((s) => ({
      image: s.photoIndex >= 0 ? editor.photos[s.photoIndex] ?? null : null,
      panX: s.panX,
      panY: s.panY,
      zoom: s.zoom,
      filter: s.filter,
    })),
  };
}

/** Repaints the live preview canvas. */
export function redrawPreview() {
  drawCover(ctx, canvas.width, canvas.height, buildRenderState(false));
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Says something in the footer status line. */
export function setStatus(text) {
  statusEl.textContent = text;
}

/** Rebuilds the photo tray thumbnails from the loaded photos. */
export function renderTray() {
  trayEl.replaceChildren();
  editor.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tray-item';
    btn.title = `${editor.photoNames[i]} — click to put it in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = editor.photoNames[i];
    btn.append(img);
    const label = document.createElement('span');
    label.textContent = editor.photoNames[i];
    btn.append(label);
    btn.addEventListener('click', () => assignPhotoToSelectedPanel(i));
    trayEl.append(btn);
  });
  if (editor.photos.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'tray-hint';
    hint.textContent = 'No photos yet — add your own or use a sample.';
    trayEl.append(hint);
  }
}

/** Puts a tray photo into the selected panel and repaints. */
export function assignPhotoToSelectedPanel(photoIndex) {
  const states = currentPanelStates();
  const panel = states[editor.selectedPanel];
  if (!panel) return;
  panel.photoIndex = photoIndex;
  panel.panX = 0.5;
  panel.panY = 0.5;
  panel.zoom = 1;
  setStatus(`Panel ${editor.selectedPanel + 1} now shows ${editor.photoNames[photoIndex]}. Drag to reposition, scroll to zoom.`);
  redrawPreview();
}

/** Fills every panel by cycling the loaded photos across them. */
export function fillAllPanels() {
  if (editor.photos.length === 0) {
    setStatus('Add a photo first, then fill the panels.');
    return;
  }
  currentPanelStates().forEach((panel, i) => {
    panel.photoIndex = i % editor.photos.length;
  });
  setStatus('Every panel filled. Click a panel to fine-tune it.');
  redrawPreview();
}

/** Adds photos from files or sample URLs to the tray. */
export async function addPhotos(entries) {
  for (const entry of entries) {
    const img = await loadImage(entry.url);
    editor.photos.push(img);
    editor.photoNames.push(entry.name);
  }
  renderTray();
  if (currentPanelStates().every((p) => p.photoIndex < 0)) fillAllPanels();
  redrawPreview();
}

/** Syncs the per-panel controls to the selected panel. */
export function syncPanelControls() {
  const panel = currentPanelStates()[editor.selectedPanel];
  document.getElementById('panelLabel').textContent =
    `Panel ${editor.selectedPanel + 1} of ${currentPanelStates().length}`;
  document.getElementById('panelFilter').value = panel?.filter ?? 'none';
  document.getElementById('zoomRange').value = String(panel?.zoom ?? 1);
}

/** Selects a panel and refreshes the highlight and its controls. */
export function selectPanel(index) {
  if (index < 0) return;
  editor.selectedPanel = index;
  syncPanelControls();
  redrawPreview();
}

function fillSelect(select, options) {
  for (const option of options) {
    const el = document.createElement('option');
    el.value = option.id;
    el.textContent = option.name;
    select.append(el);
  }
}

function wireControls() {
  const layoutSelect = document.getElementById('layoutSelect');
  fillSelect(layoutSelect, LAYOUTS);
  layoutSelect.value = editor.layoutId;
  layoutSelect.addEventListener('change', () => {
    editor.layoutId = layoutSelect.value;
    editor.selectedPanel = 0;
    syncPanelControls();
    redrawPreview();
    setStatus(`Layout: ${layoutById(editor.layoutId).name}.`);
  });

  const gradeSelect = document.getElementById('gradeSelect');
  fillSelect(gradeSelect, GLOBAL_GRADES);
  gradeSelect.value = editor.grade;
  gradeSelect.addEventListener('change', () => {
    editor.grade = gradeSelect.value;
    redrawPreview();
  });
  fillSelect(document.getElementById('panelFilter'), PANEL_FILTERS);

  document.getElementById('titleInput').addEventListener('input', (e) => {
    editor.title = e.target.value;
    redrawPreview();
  });
  document.getElementById('subtitleInput').addEventListener('input', (e) => {
    editor.subtitle = e.target.value;
    redrawPreview();
  });
  document.getElementById('gradeRange').addEventListener('input', (e) => {
    editor.gradeStrength = Number(e.target.value);
    redrawPreview();
  });
  document.getElementById('grainToggle').addEventListener('change', (e) => {
    editor.grain = e.target.checked;
    redrawPreview();
  });
  document.getElementById('vignetteToggle').addEventListener('change', (e) => {
    editor.vignette = e.target.checked;
    redrawPreview();
  });
  document.getElementById('panelFilter').addEventListener('change', (e) => {
    const panel = currentPanelStates()[editor.selectedPanel];
    if (panel) panel.filter = e.target.value;
    redrawPreview();
  });
  document.getElementById('zoomRange').addEventListener('input', (e) => {
    const panel = currentPanelStates()[editor.selectedPanel];
    if (panel) panel.zoom = Number(e.target.value);
    redrawPreview();
  });
  document.getElementById('resetPanel').addEventListener('click', () => {
    const panel = currentPanelStates()[editor.selectedPanel];
    if (panel) {
      panel.panX = 0.5;
      panel.panY = 0.5;
      panel.zoom = 1;
    }
    syncPanelControls();
    redrawPreview();
  });
  document.getElementById('clearPanel').addEventListener('click', () => {
    const panel = currentPanelStates()[editor.selectedPanel];
    if (panel) panel.photoIndex = -1;
    setStatus(`Panel ${editor.selectedPanel + 1} cleared — it draws its own sunset scene.`);
    redrawPreview();
  });
  document.getElementById('fillAll').addEventListener('click', fillAllPanels);

  document.getElementById('photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (files.length === 0) return;
    await addPhotos(files.map((f) => ({ url: URL.createObjectURL(f), name: f.name })));
    setStatus(`${files.length} photo(s) added — they never leave this machine.`);
    e.target.value = '';
  });
  document.getElementById('samplePier').addEventListener('click', () =>
    addPhotos([{ url: 'samples/pier.jpg', name: 'Pier sample' }]));
  document.getElementById('sampleBlvd').addEventListener('click', () =>
    addPhotos([{ url: 'samples/boulevard.jpg', name: 'Boulevard sample' }]));

  document.getElementById('exportSquare').addEventListener('click', () => exportAndReport(1080, 1080));
  document.getElementById('exportPortrait').addEventListener('click', () => exportAndReport(1080, 1350));
  document.getElementById('exportWide').addEventListener('click', () => exportAndReport(1920, 1080));
}

/** Exports at one post size and reports the file in the status line. */
export function exportAndReport(width, height) {
  downloadCoverPNG(buildRenderState(true), width, height);
  setStatus(`Saved vice-panel-cover-${width}x${height}.png`);
}

/** Pointer position in canvas pixels for a pointer event on the canvas. */
export function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function wireCanvasPointer() {
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const layout = layoutById(editor.layoutId);
    const index = panelIndexAt(layout, canvas.width, canvas.height, point.x, point.y);
    if (index < 0) return;
    selectPanel(index);
    const panel = currentPanelStates()[index];
    drag = { lastX: point.x, lastY: point.y, panel };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = canvasPoint(event);
    const dx = point.x - drag.lastX;
    const dy = point.y - drag.lastY;
    drag.lastX = point.x;
    drag.lastY = point.y;
    const image = drag.panel.photoIndex >= 0 ? editor.photos[drag.panel.photoIndex] : null;
    if (!image) return;
    const layout = layoutById(editor.layoutId);
    const rect = layout.panels[editor.selectedPanel];
    const panelPx = { x: rect.x * canvas.width, y: rect.y * canvas.height, w: rect.w * canvas.width, h: rect.h * canvas.height };
    const fit = coverFitRect(image, panelPx, drag.panel.zoom, drag.panel.panX, drag.panel.panY);
    const overflowX = fit.dw - panelPx.w;
    const overflowY = fit.dh - panelPx.h;
    if (overflowX > 0) drag.panel.panX = Math.min(1, Math.max(0, drag.panel.panX - dx / overflowX));
    if (overflowY > 0) drag.panel.panY = Math.min(1, Math.max(0, drag.panel.panY - dy / overflowY));
    redrawPreview();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (event) => {
    const panel = currentPanelStates()[editor.selectedPanel];
    if (!panel || panel.photoIndex < 0) return;
    event.preventDefault();
    panel.zoom = Math.min(3.5, Math.max(1, panel.zoom * (event.deltaY < 0 ? 1.08 : 0.93)));
    document.getElementById('zoomRange').value = String(panel.zoom);
    redrawPreview();
  }, { passive: false });
}

/** Applies a shot scene: layout, words, grade and sample-filled panels. */
export async function applyShotScene(config) {
  editor.layoutId = config.layoutId;
  editor.title = config.title;
  editor.subtitle = config.subtitle;
  editor.grade = config.grade;
  document.getElementById('layoutSelect').value = config.layoutId;
  document.getElementById('gradeSelect').value = config.grade;
  document.getElementById('titleInput').value = config.title;
  document.getElementById('subtitleInput').value = config.subtitle;
  for (const name of config.sampleNames) {
    const img = await loadImage(`samples/${name}.jpg`);
    editor.photos.push(img);
    editor.photoNames.push(name);
  }
  renderTray();
  const states = currentPanelStates();
  states.forEach((panel, i) => {
    panel.photoIndex = editor.photos.length ? i % editor.photos.length : -1;
    panel.filter = config.filterIds[i] ?? config.filterIds[0] ?? 'none';
    panel.panX = 0.5;
    panel.panY = config.panY;
  });
  if (config.mode === 'cover') {
    editor.shotCoverMode = true;
    document.body.classList.add('shot-cover');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  syncPanelControls();
  redrawPreview();
  signalShotReady();
}

window.__vicePanel = {
  exportPNG(width, height) {
    downloadCoverPNG(buildRenderState(true), width, height);
  },
  state() {
    return {
      layoutId: editor.layoutId,
      title: editor.title,
      subtitle: editor.subtitle,
      grade: editor.grade,
      gradeStrength: editor.gradeStrength,
      grain: editor.grain,
      vignette: editor.vignette,
      photoNames: [...editor.photoNames],
      selectedPanel: editor.selectedPanel,
      panels: currentPanelStates().map((p) => ({ ...p })),
    };
  },
};

wireControls();
wireCanvasPointer();
syncPanelControls();

const shotConfig = readShotConfig();
if (shotConfig) {
  applyShotScene(shotConfig);
} else {
  redrawPreview();
}
