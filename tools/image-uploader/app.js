const list = document.getElementById('list');
const counter = document.getElementById('counter');
const search = document.getElementById('search');
const onlyIncomplete = document.getElementById('only-incomplete');
const collapseAll = document.getElementById('collapse-all');
const fileInput = document.getElementById('file-input');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

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
    if (img.isConnected && img.naturalWidth) openLightbox(img.src, img.alt);
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
    pickFile(e, frame);
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
    cell('original 1', originalSlot(e, 0)),
    cell('original 2', originalSlot(e, 1)),
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

function selectPreview(id) {
  previewId = id ?? null;
  if (previewId) localStorage.setItem(PREVIEW, previewId);
  list.querySelectorAll('.card.selected').forEach((c) => c.classList.remove('selected'));
  list.querySelector(`.card[data-id="${id}"]`)?.classList.add('selected');
  renderPreview();
}

/** Mirrors ExerciseDetail: the two frames, then the facts table, then steps. */
function renderPreview() {
  const e = exercises.find((x) => x.sourceId === previewId);
  previewScreen.replaceChildren();
  previewTitle.textContent = e?.name ?? '';
  if (!e) return;

  const frames = row('frames');
  for (const frame of [1, 2]) {
    const img = document.createElement('img');
    img.src = e.mascot[frame - 1] ? mascotUrl(e, frame) : `/api/placeholder/${frame}`;
    img.alt = `${e.name} frame ${frame}`;
    frames.append(img);
  }

  const facts = row('facts');
  const values = [
    ['Equipment', e.equipment],
    ['Primary', e.primaryMuscles.join(', ')],
    ['Secondary', e.secondaryMuscles.join(', ')],
    ['Level', e.level],
    ['Mechanic', e.mechanic],
    ['Force', e.force],
    ['Category', e.category],
  ];
  for (const [label, value] of values) {
    if (value) facts.append(row('fact', span('k', label), span('v', value)));
  }

  previewScreen.append(frames, facts);
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

const BODY_LIMIT = 4 * 1024 * 1024;

/**
 * Serverless functions reject request bodies over 4.5 MB, so an oversized file
 * is re-encoded to the master canvas here first — the same resize the server
 * would have done anyway, just early enough to fit through.
 */
function shrinkToMaster(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = () => rej(new Error('could not decode the image'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1200;
      const scale = Math.min(1200 / img.width, 1200 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      canvas.getContext('2d').drawImage(img, (1200 - w) / 2, (1200 - h) / 2, w, h);
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
  const body = await res.json();
  if (!res.ok) {
    showError(e.sourceId, frame, body.error ?? 'upload failed');
    return;
  }
  e.mascot[frame - 1] = body.mtime;
  e.mascotUrl[frame - 1] = body.url;
  e.warnings[frame - 1] = body.warnings?.length ? body.warnings : null;
  rerenderCard(e);
}

async function remove(e, frame) {
  await fetch(`/api/mascot/${e.sourceId}/${frame}`, { method: 'DELETE' });
  e.mascot[frame - 1] = null;
  e.mascotUrl[frame - 1] = null;
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

function openLightbox(src, alt) {
  lightboxImg.crossOrigin = 'anonymous';
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.hidden = false;
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.removeAttribute('src');
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
  if (ev.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

document.addEventListener('paste', (ev) => {
  if (!focused?.isConnected) return;
  const file = [...ev.clipboardData.files].find((f) => f.type.startsWith('image/'));
  if (!file) return;
  ev.preventDefault();
  const e = exercises.find((x) => x.sourceId === focused.dataset.id);
  upload(e, Number(focused.dataset.frame), file);
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
  phone.className = `phone ${scheme}`;
  previewScheme.textContent = scheme === 'dark' ? 'Light' : 'Dark';
  localStorage.setItem(SCHEME, scheme);
}

previewScheme.addEventListener('click', () =>
  setScheme(phone.classList.contains('dark') ? 'light' : 'dark'),
);
setScheme(localStorage.getItem(SCHEME) ?? 'light');

search.addEventListener('input', render);
onlyIncomplete.addEventListener('change', render);

(async () => {
  exercises = await (await fetch('/api/exercises')).json();
  // Warnings describe an upload, not a stored file, so they live for the session only.
  for (const e of exercises) e.warnings = [null, null];
  collapseAll.textContent = collapsed.size >= exercises.length ? 'Expand all' : 'Collapse all';
  render();
})();
