const list = document.getElementById('list');
const counter = document.getElementById('counter');
const search = document.getElementById('search');
const onlyIncomplete = document.getElementById('only-incomplete');
const collapseAll = document.getElementById('collapse-all');
const fileInput = document.getElementById('file-input');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxStrip = document.getElementById('lightbox-strip');

const phone = document.getElementById('phone');
const previewScreen = document.getElementById('preview-screen');
const previewTitle = document.getElementById('preview-title');
const previewScheme = document.getElementById('preview-scheme');

const COLLAPSED = 'pawer.uploader.collapsed';
const collapsed = new Set(JSON.parse(localStorage.getItem(COLLAPSED) ?? '[]'));
const saveCollapsed = () => localStorage.setItem(COLLAPSED, JSON.stringify([...collapsed]));

const PREVIEW = 'pawer.uploader.preview';
const SCHEME = 'pawer.uploader.scheme';

let exercises = [];
let focused = null;
let previewId = localStorage.getItem(PREVIEW);

const REFERENCES = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises';

const originalUrl = (id, index) => `${REFERENCES}/${id}/${index}.jpg`;
const mascotUrl = (e, frame) => `${e.mascotUrl[frame - 1]}?v=${e.mascot[frame - 1]}`;
const isDone = (e) => e.mascot[0] !== null && e.mascot[1] !== null;

function stateOf(e) {
  const filled = e.mascot.filter(Boolean).length;
  return filled === 2 ? 'done' : filled === 1 ? 'partial' : 'empty';
}

function cell(label, slot, mascot) {
  const el = document.createElement('div');
  el.className = mascot ? 'cell mascot-cell' : 'cell';
  const caption = document.createElement('span');
  caption.className = 'label';
  caption.textContent = label;
  el.append(slot, caption);
  return el;
}

function originalCell(e, index) {
  return cell(`original ${index + 1}`, originalSlot(e, index));
}

function originalSlot(e, index) {
  const slot = document.createElement('div');
  slot.className = 'slot original';
  const img = document.createElement('img');
  img.loading = 'lazy';
  // Anonymous CORS is what keeps the lightbox's canvas copy untainted.
  img.crossOrigin = 'anonymous';
  img.alt = `${e.name} reference ${index + 1}`;
  // A 404 from the CDN is the only signal that upstream has no photo for this one.
  img.addEventListener('error', () => {
    slot.className = 'slot';
    slot.innerHTML = '<span class="empty">no reference photo</span>';
  });
  img.src = originalUrl(e.sourceId, index);
  slot.append(img);
  slot.addEventListener('click', () => {
    if (img.isConnected && img.naturalWidth) openLightbox(e, `original ${index + 1}`);
  });
  return slot;
}

function mascotSlot(e, frame) {
  const mtime = e.mascot[frame - 1];
  const slot = document.createElement('div');
  slot.className = 'slot mascot';
  if (e.warnings?.[frame - 1]) slot.classList.add('warned');
  slot.tabIndex = 0;

  if (mtime) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = mascotUrl(e, frame);
    img.alt = `${e.name} mascot ${frame}`;
    const tools = document.createElement('div');
    tools.className = 'tools';
    tools.innerHTML = '<button type="button" data-act="replace">Replace</button><button type="button" data-act="delete">Delete</button>';
    tools.addEventListener('click', (ev) => {
      const act = ev.target.dataset?.act;
      if (!act) return;
      ev.stopPropagation();
      if (act === 'replace') pickFile(e, frame);
      else remove(e, frame);
    });
    slot.append(img, tools);
  } else {
    slot.innerHTML = `<span class="plus">+</span>`;
  }

  slot.addEventListener('click', () => {
    setFocus(slot);
    if (mtime) {
      openLightbox(e, `mascot ${frame}`);
    } else {
      pickFile(e, frame);
    }
  });
  slot.addEventListener('focus', () => setFocus(slot));
  slot.addEventListener('dragover', (ev) => {
    ev.preventDefault();
    slot.classList.add('dragover');
  });
  slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
  slot.addEventListener('drop', (ev) => {
    ev.preventDefault();
    slot.classList.remove('dragover');
    const file = ev.dataTransfer.files[0];
    if (file) upload(e, frame, file);
  });

  slot.dataset.id = e.sourceId;
  slot.dataset.frame = String(frame);
  return slot;
}

function setFocus(slot) {
  document.querySelectorAll('.slot.focused').forEach((s) => s.classList.remove('focused'));
  slot.classList.add('focused');
  focused = slot;
}

function card(e) {
  const el = document.createElement('section');
  el.className = 'card';
  el.dataset.id = e.sourceId;
  el.dataset.state = stateOf(e);
  if (collapsed.has(e.sourceId)) el.classList.add('collapsed');
  if (e.sourceId === previewId) el.classList.add('selected');
  el.addEventListener('click', () => selectPreview(e.sourceId));

  const head = document.createElement('div');
  head.className = 'card-head';
  head.innerHTML = `<h2>${e.name}</h2><span class="meta">${[e.equipment, e.muscle].filter(Boolean).join(' · ')}</span><span class="dot"></span>`;
  head.addEventListener('click', () => {
    el.classList.toggle('collapsed');
    if (el.classList.contains('collapsed')) collapsed.add(e.sourceId);
    else collapsed.delete(e.sourceId);
    saveCollapsed();
  });

  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.append(
    originalCell(e, 0),
    originalCell(e, 1),
    cell('mascot 1', mascotSlot(e, 1), true),
    cell('mascot 2', mascotSlot(e, 2), true),
  );

  for (const [i, warnings] of (e.warnings ?? []).entries()) {
    for (const text of warnings ?? []) {
      const p = document.createElement('p');
      p.className = 'warning';
      p.textContent = `mascot ${i + 1}: ${text}`;
      grid.append(p);
    }
  }

  el.append(head, grid);
  return el;
}

function row(className, ...children) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...children);
  return el;
}

function span(className, text) {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

/** An exercise with no master yet previews against its upstream reference photo. */
function previewFrame(e, index) {
  const img = document.createElement('img');
  img.alt = `${e.name} frame ${index + 1}`;
  img.addEventListener('error', () => img.classList.add('missing'));
  img.src = e.mascot[index] ? mascotUrl(e, index + 1) : originalUrl(e.sourceId, index);
  if (e.sourceUrl[index]) {
    img.classList.add('editable');
    img.addEventListener('click', () => startReframe(e, index));
  }
  return img;
}

/**
 * Reframing happens in the preview tile itself: the square keeps its place in
 * the layout while the whole source hangs out of it, so what is inside the
 * outline is exactly what ships. The crop lives in source pixels; `scale` is the
 * only thing that converts it to the tile.
 */
let reframing = null;

function startReframe(e, index) {
  const frame = document.createElement('div');
  frame.className = 'frame reframing';

  // Two copies of the source at the same position: a dim one that overflows the
  // tile, and a clipped one on top, so the crop reads crisp against the rest.
  const ghost = document.createElement('img');
  const clip = document.createElement('div');
  clip.className = 'clip';
  const img = document.createElement('img');
  clip.append(img);
  frame.append(ghost, clip);

  for (const corner of ['nw', 'ne', 'se', 'sw']) {
    const handle = document.createElement('span');
    handle.className = 'handle';
    handle.dataset.corner = corner;
    frame.append(handle);
  }

  // A copy, so Cancel really cancels.
  reframing = { e, index, frame, img, ghost, crop: e.crop[index] && { ...e.crop[index] } };
  ghost.addEventListener('load', () => {
    // A master uploaded before crops existed has none stored; the square it
    // already ships is the centred one, so start there.
    const size = Math.min(ghost.naturalWidth, ghost.naturalHeight);
    reframing.crop = reframing.crop ?? {
      x: (ghost.naturalWidth - size) / 2,
      y: (ghost.naturalHeight - size) / 2,
      size,
    };
    layoutReframe();
  });
  ghost.src = img.src = `${e.sourceUrl[index]}?v=${e.mascot[index]}`;
  frame.addEventListener('pointerdown', onReframePointerDown);
  renderPreview();
}

function endReframe() {
  reframing = null;
  phone.classList.remove('reframing');
  renderPreview();
}

/** Tile pixels per source pixel. */
const reframeScale = () => reframing.frame.clientWidth / reframing.crop.size;

function layoutReframe() {
  const { img, ghost, crop } = reframing;
  const k = reframeScale();
  // .clip is inset:0 of the frame, so both copies share one origin.
  for (const el of [img, ghost]) {
    el.style.width = `${ghost.naturalWidth * k}px`;
    el.style.left = `${-crop.x * k}px`;
    el.style.top = `${-crop.y * k}px`;
  }
}

function onReframePointerDown(ev) {
  const { crop } = reframing;
  const corner = ev.target.dataset?.corner;
  if (!corner && ev.target.tagName !== 'IMG') return;
  ev.preventDefault();

  const side = reframing.frame.clientWidth;
  const k = reframeScale();
  const start = { pointerX: ev.clientX, pointerY: ev.clientY, ...crop };

  const move = (m) => {
    const dx = m.clientX - start.pointerX;
    const dy = m.clientY - start.pointerY;
    if (!corner) {
      crop.x = start.x - dx / k;
      crop.y = start.y - dy / k;
    } else {
      const west = corner === 'nw' || corner === 'sw';
      const north = corner === 'nw' || corner === 'ne';
      // The box cannot actually grow — the tile is fixed — so dragging a corner
      // outward means the square should take in more of the source.
      const pulled = ((west ? -dx : dx) + (north ? -dy : dy)) / 2;
      crop.size = start.size * (Math.max(24, side + pulled) / side);
      // The opposite corner of the square is the anchor.
      crop.x = west ? start.x + start.size - crop.size : start.x;
      crop.y = north ? start.y + start.size - crop.size : start.y;
    }
    layoutReframe();
  };

  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

async function saveReframe() {
  const { e, index, crop } = reframing;
  const res = await fetch(`/api/reframe/${e.sourceId}/${index + 1}`, {
    method: 'POST',
    body: JSON.stringify(crop),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    previewScreen.prepend(row('error', document.createTextNode(body.error ?? `failed with ${res.status}`)));
    return;
  }
  e.mascot[index] = body.mtime;
  e.mascotUrl[index] = body.url;
  e.crop[index] = body.crop;
  endReframe();
  rerenderCard(e);
}

function selectPreview(id) {
  if (reframing && reframing.e.sourceId !== id) reframing = null;
  previewId = id ?? null;
  if (previewId) localStorage.setItem(PREVIEW, previewId);
  list.querySelectorAll('.card.selected').forEach((c) => c.classList.remove('selected'));
  list.querySelector(`.card[data-id="${id}"]`)?.classList.add('selected');
  renderPreview();
}

/** Mirrors ExerciseDetail: the two exercise frames, then the steps. */
function renderPreview() {
  const e = exercises.find((x) => x.sourceId === previewId);
  previewScreen.replaceChildren();
  previewTitle.textContent = e?.name ?? '';
  if (!e) return;

  const frames = [0, 1].map((index) =>
    reframing?.e === e && reframing.index === index ? reframing.frame : previewFrame(e, index),
  );
  previewScreen.append(row('frames', ...frames));

  phone.classList.toggle('reframing', reframing?.e === e);
  if (reframing?.e === e) {
    const save = document.createElement('button');
    save.textContent = 'Save';
    save.addEventListener('click', saveReframe);
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', endReframe);
    previewScreen.append(row('reframe-bar', save, cancel));
    requestAnimationFrame(layoutReframe);
  }

  for (const [i, step] of e.instructions.entries()) {
    previewScreen.append(row('step', span('n', String(i + 1)), span('t', step)));
  }
}

function render() {
  const q = search.value.trim().toLowerCase();
  list.replaceChildren();
  for (const e of exercises) {
    if (onlyIncomplete.checked && isDone(e)) continue;
    if (q && !e.name.toLowerCase().includes(q) && !e.sourceId.toLowerCase().includes(q)) continue;
    list.append(card(e));
  }
  counter.textContent = `Counter: ${exercises.filter(isDone).length}/${exercises.length}`;
  selectPreview(
    list.querySelector(`.card[data-id="${previewId}"]`)
      ? previewId
      : (list.firstElementChild?.dataset.id ?? previewId),
  );
}

function rerenderCard(e) {
  const old = list.querySelector(`.card[data-id="${e.sourceId}"]`);
  if (!old) return;
  if (onlyIncomplete.checked && isDone(e)) old.remove();
  else old.replaceWith(card(e));
  if (e.sourceId === previewId) renderPreview();
  counter.textContent = `Counter: ${exercises.filter(isDone).length}/${exercises.length}`;
}

function slotFor(id, frame) {
  return list.querySelector(`.slot.mascot[data-id="${id}"][data-frame="${frame}"]`);
}

function showError(id, frame, message) {
  const slot = slotFor(id, frame);
  slot?.classList.remove('busy');
  const grid = slot?.closest('.grid');
  if (!grid) return;
  grid.querySelector('.error')?.remove();
  const p = document.createElement('p');
  p.className = 'error';
  p.textContent = message;
  grid.append(p);
}

// Well under what a Vercel function will buffer, so an oversized drop is
// re-encoded here rather than refused there.
const BODY_LIMIT = 4 * 1024 * 1024;
const MASTER_SIZE = 1200;

/**
 * The server refuses bodies over its limit, so an oversized file is re-encoded
 * here first — the same downscale the server would have done anyway, just early
 * enough to fit through. Aspect ratio is left alone; the crop makes it square.
 */
function shrinkToMaster(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = () => rej(new Error('could not decode the image'));
    img.onload = () => {
      const scale = Math.min(1, MASTER_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? res(blob) : rej(new Error('encode failed'))), 'image/png');
    };
    img.src = URL.createObjectURL(file);
  });
}

async function upload(e, frame, file) {
  const slot = slotFor(e.sourceId, frame);
  slot?.classList.add('busy');
  slot?.closest('.grid').querySelector('.error')?.remove();
  try {
    if (file.size > BODY_LIMIT) file = await shrinkToMaster(file);
  } catch (err) {
    showError(e.sourceId, frame, err.message);
    return;
  }
  const res = await fetch(`/api/mascot/${e.sourceId}/${frame}`, { method: 'PUT', body: file });
  const text = await res.text();
  const body = text.startsWith('{') ? JSON.parse(text) : {};
  if (!res.ok) {
    showError(e.sourceId, frame, body.error ?? `upload failed with ${res.status}. ${text.trim()}`);
    return;
  }
  e.mascot[frame - 1] = body.mtime;
  e.mascotUrl[frame - 1] = body.url;
  e.crop[frame - 1] = body.crop;
  e.warnings[frame - 1] = body.warnings?.length ? body.warnings : null;
  // The source blob is written under the same name, so its url only differs by
  // the prefix — no second listing needed to learn it.
  e.sourceUrl[frame - 1] = body.url.replace('/masters/exercises/', '/masters/sources/');
  rerenderCard(e);
}

async function remove(e, frame) {
  await fetch(`/api/mascot/${e.sourceId}/${frame}`, { method: 'DELETE' });
  e.mascot[frame - 1] = null;
  e.mascotUrl[frame - 1] = null;
  e.sourceUrl[frame - 1] = null;
  e.crop[frame - 1] = null;
  e.warnings[frame - 1] = null;
  rerenderCard(e);
}

function pickFile(e, frame) {
  fileInput.value = '';
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (file) upload(e, frame, file);
  };
  fileInput.click();
}

/** Every image the exercise has, in card order — an empty mascot has none. */
function lightboxFrames(e) {
  const frames = [0, 1].map((index) => ({
    label: `original ${index + 1}`,
    src: originalUrl(e.sourceId, index),
  }));
  for (const frame of [1, 2]) {
    if (e.mascot[frame - 1]) frames.push({ label: `mascot ${frame}`, src: mascotUrl(e, frame) });
  }
  return frames;
}

let frames = [];
let frameIndex = 0;

function openLightbox(e, label) {
  frames = lightboxFrames(e);
  lightboxStrip.replaceChildren(
    ...frames.map((f, i) => {
      const thumb = document.createElement('img');
      thumb.src = f.src;
      thumb.alt = f.label;
      thumb.addEventListener('error', () => thumb.classList.add('missing'));
      thumb.addEventListener('click', (ev) => {
        ev.stopPropagation();
        showFrame(i);
      });
      return thumb;
    }),
  );
  lightbox.hidden = false;
  showFrame(Math.max(0, frames.findIndex((f) => f.label === label)));
}

function showFrame(i) {
  frameIndex = (i + frames.length) % frames.length;
  const frame = frames[frameIndex];
  lightboxImg.crossOrigin = 'anonymous';
  lightboxImg.src = frame.src;
  lightboxImg.alt = frame.label;
  for (const [n, thumb] of [...lightboxStrip.children].entries()) {
    thumb.classList.toggle('current', n === frameIndex);
  }
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.removeAttribute('src');
  lightboxStrip.replaceChildren();
}

/** The Clipboard API only accepts PNG, so the jpg goes through a canvas first. */
async function copyLightbox() {
  const btn = document.getElementById('lightbox-copy');
  const png = new Promise((res, rej) => {
    const canvas = document.createElement('canvas');
    canvas.width = lightboxImg.naturalWidth;
    canvas.height = lightboxImg.naturalHeight;
    canvas.getContext('2d').drawImage(lightboxImg, 0, 0);
    canvas.toBlob((blob) => (blob ? res(blob) : rej(new Error('encode failed'))), 'image/png');
  });
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    btn.textContent = 'Copied';
  } catch (err) {
    btn.textContent = `Copy failed: ${err.message}`;
  }
  setTimeout(() => (btn.textContent = 'Copy image'), 1500);
}

document.getElementById('lightbox-copy').addEventListener('click', copyLightbox);
document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (ev) => {
  if (ev.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (ev) => {
  if (lightbox.hidden) return;
  if (ev.key === 'Escape') closeLightbox();
  else if (ev.key === 'ArrowLeft' || ev.key === ',' || ev.key === '<') showFrame(frameIndex - 1);
  else if (ev.key === 'ArrowRight' || ev.key === '.' || ev.key === '>') showFrame(frameIndex + 1);
  else return;
  ev.preventDefault();
});

document.addEventListener('paste', (ev) => {
  if (!focused?.isConnected) return;
  const file = [...ev.clipboardData.files].find((f) => f.type.startsWith('image/'));
  if (!file) return;
  ev.preventDefault();
  const e = exercises.find((x) => x.sourceId === focused.dataset.id);
  upload(e, Number(focused.dataset.frame), file);
});

document.getElementById('export').addEventListener('click', () => {
  window.location.href = '/api/export';
});

collapseAll.addEventListener('click', () => {
  const expanding = collapsed.size >= exercises.length;
  collapsed.clear();
  if (!expanding) for (const e of exercises) collapsed.add(e.sourceId);
  saveCollapsed();
  collapseAll.textContent = expanding ? 'Collapse all' : 'Expand all';
  render();
});

function setScheme(scheme) {
  phone.classList.toggle('dark', scheme === 'dark');
  phone.classList.toggle('light', scheme !== 'dark');
  previewScheme.textContent = scheme === 'dark' ? 'Light' : 'Dark';
  localStorage.setItem(SCHEME, scheme);
}

previewScheme.addEventListener('click', () =>
  setScheme(phone.classList.contains('dark') ? 'light' : 'dark'),
);
setScheme(localStorage.getItem(SCHEME) ?? 'light');

const basePrompt = document.getElementById('base-prompt');
const basePromptCopy = document.getElementById('base-prompt-copy');
// The markup holds the default; an edit overrides it from then on.
const BASE_PROMPT = 'pawer.uploader.basePrompt';
basePrompt.value = localStorage.getItem(BASE_PROMPT) ?? basePrompt.value;
basePrompt.addEventListener('input', () => localStorage.setItem(BASE_PROMPT, basePrompt.value));
basePromptCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(basePrompt.value);
    basePromptCopy.textContent = 'Copied';
  } catch (err) {
    basePromptCopy.textContent = err.message;
  }
  setTimeout(() => (basePromptCopy.textContent = 'Copy'), 1500);
});

search.addEventListener('input', render);
onlyIncomplete.addEventListener('change', render);

async function load(url) {
  const res = await fetch(url);
  if (res.ok) return res.json();
  throw new Error(`${url} failed with ${res.status}. ${(await res.text()).trim()}`);
}

(async () => {
  let seed;
  try {
    // The seed is a static file; only which masters exist needs the API.
    seed = await load('/exercises.json');
  } catch (err) {
    counter.textContent = `Counter: —`;
    list.innerHTML = `<p class="error">${err.message}</p>`;
    return;
  }

  // A store that will not answer still leaves the references browsable, but the
  // banner has to stay up: every slot would otherwise read as "not uploaded yet".
  let stored = {};
  let storeError = null;
  try {
    stored = await load('/api/masters');
  } catch (err) {
    storeError = err.message;
  }
  exercises = seed.map((e) => ({
    ...e,
    mascot: [1, 2].map((frame) => stored[`${e.sourceId}_${frame}.png`]?.mtime ?? null),
    mascotUrl: [1, 2].map((frame) => stored[`${e.sourceId}_${frame}.png`]?.url ?? null),
    sourceUrl: [1, 2].map((frame) => stored[`${e.sourceId}_${frame}.png`]?.sourceUrl ?? null),
    crop: [1, 2].map((frame) => stored[`${e.sourceId}_${frame}.png`]?.crop ?? null),
    // Warnings describe an upload, not a stored file, so they live for the session only.
    warnings: [null, null],
  }));
  collapseAll.textContent = collapsed.size >= exercises.length ? 'Expand all' : 'Collapse all';
  render();
  if (storeError) list.prepend(row('error', document.createTextNode(storeError)));
})();
