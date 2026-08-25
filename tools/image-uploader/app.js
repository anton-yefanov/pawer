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

const CHARACTER_SPEC = `Reproduce the mascot exactly as shown in CHARACTER REFERENCE. Treat the face as a strict identity lock: copy the same head silhouette and proportions; ear size, angle, and spacing; forehead stripes; cheek stripes and tufts; white blaze and muzzle shape; small pink nose; amber eye color, narrow half-lidded eye shape, eyelid angle, and eye spacing; whisker placement; and the tiny closed mouth with its subtle, calm, mildly self-assured expression. Do not make the eyes rounder, wider, friendlier, fiercer, or more alert, and do not give the mascot a grin, snarl, open mouth, raised eyebrows, or determined workout face. The face must read as the same individual, not merely a similar orange cat.

Match the same light orange-and-white fur and markings, striped orange tail, and established head-to-body proportions. The body is tall, lean, and moderately athletic with natural definition—not a bodybuilder: keep the reference's relatively narrow shoulders and torso, restrained chest and arm volume, and slim waist and legs. Do not enlarge the neck, trapezius, shoulders, biceps, forearms, chest, or thighs; do not add bulging muscles, extreme vascularity, or exaggerated definition. Preserve the white tank top with dark edging; dark green athletic shorts with white piping and drawstring; white crew socks with two green stripes; and white-and-gray athletic shoes. Match the model sheet's clean hand-drawn linework, warm colors, subtle cel shading, and level of detail. Do not redesign, simplify, darken, exaggerate, or change the mascot's face, markings, outfit, build, or proportions.`;

function exercisePrompt(e, index) {
  const frame = index + 1;
  const phase = frame === 1 ? 'first photographed position' : 'second photographed position';
  const equipment = e.equipment && e.equipment !== 'body only' ? e.equipment : 'no separate equipment';
  const instructions = e.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n');

  return `Create one square 1:1 full-body illustration of the cat mascot performing the exact ${e.name} position shown in EXERCISE REFERENCE ${frame}.

REFERENCE PRIORITY:
1. CHARACTER REFERENCE controls the mascot's exact identity, anatomy, clothing, colors, markings, and illustration style.
2. EXERCISE REFERENCE ${frame} controls the exact pose, movement phase, body orientation, camera angle, grip, equipment geometry, contact points, and framing. It is the ${phase}; do not substitute the other endpoint of the repetition.

POSE — REPRODUCE PRECISELY:
Study EXERCISE REFERENCE ${frame} closely and reproduce every visible joint angle and spatial relationship: head direction; neck and spine alignment; torso lean or rotation; shoulder position; left and right upper-arm, elbow, forearm, wrist, and hand positions; hip height and rotation; left and right thigh, knee, lower-leg, ankle, and foot positions; stance width; balance; and all body-to-equipment contact points. Preserve any intentional asymmetry or unilateral action. Do not mirror the pose, average it with the other exercise frame, or invent a more generic ${e.name} pose. Keep the anatomy stable, believable, and mechanically correct.

EXERCISE CONTEXT:
Exercise: ${e.name}
Reference frame: ${frame} of 2 (${phase})
Equipment: ${equipment}
Primary muscles: ${e.primaryMuscles.join(', ') || 'not specified'}
Secondary muscles: ${e.secondaryMuscles.join(', ') || 'none'}
Movement instructions for resolving details that are obscured in the photo:
${instructions}

CHARACTER CONSISTENCY — HIGHEST PRIORITY:
${CHARACTER_SPEC}

EQUIPMENT AND CONTACTS:
Include exactly the exercise equipment visible and necessary in EXERCISE REFERENCE ${frame}. Match its functional type, orientation, attachment points, supports, pads, handles, bar path, cables, bands, plates, bench angle, or platform placement as applicable. Every hand, foot, knee, hip, back, or shoulder contact must connect logically—nothing may pass through, float away from, or sit behind the wrong body part. Do not add unrelated equipment, extra weights, extra handles, or extra limbs.

TAIL:
The tail must emerge anatomically from the base of the spine beneath the shorts' waistband, never from the middle of the back. Place it naturally where it remains visible if possible without intersecting the body, floor, bench, machine, cable, bar, weights, or other equipment. The tail must not change the exercise pose or balance.

COMPOSITION:
Show one complete mascot and all equipment needed to make this exact position unmistakable. Keep the same viewpoint as EXERCISE REFERENCE ${frame}; do not force a frontal view when the reference is side, rear, three-quarter, high, or low angle. Fit ears, tail, shoes, hands, weights, and essential equipment inside a square canvas with comfortable margins. Use a transparent background. No gym environment, people, spotters, text, logos, arrows, borders, motion trails, anatomy overlays, or instructional graphics. Create one finished illustration only—not multiple poses or a character sheet.

Before finalizing, compare the result directly with EXERCISE REFERENCE ${frame}: verify the movement endpoint, silhouette, joint angles, grip and stance, gaze and torso direction, camera angle, equipment contacts and geometry, complete framing, correct tail attachment, and unchanged mascot design.`;
}

function originalCell(e, index) {
  const el = cell(`original ${index + 1}`, originalSlot(e, index));
  const prompt = document.createElement('textarea');
  prompt.className = 'prompt';
  prompt.rows = 4;
  prompt.value = exercisePrompt(e, index);
  prompt.setAttribute('aria-label', `${e.name} reference ${index + 1} image-generation prompt`);
  prompt.spellcheck = false;
  prompt.addEventListener('click', (event) => event.stopPropagation());
  el.append(prompt);
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
    if (mtime) {
      const img = slot.querySelector('img');
      openLightbox(img.src, img.alt);
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
  return img;
}

function selectPreview(id) {
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

  previewScreen.append(row('frames', previewFrame(e, 0), previewFrame(e, 1)));
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

const BODY_LIMIT = 32 * 1024 * 1024;
const MASTER_SIZE = 1200;

/**
 * The server refuses bodies over its limit, so an oversized file is re-encoded
 * to the master canvas here first — the same resize the server would have done
 * anyway, just early enough to fit through.
 */
function shrinkToMaster(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = () => rej(new Error('could not decode the image'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = MASTER_SIZE;
      const scale = Math.min(MASTER_SIZE / img.width, MASTER_SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      canvas.getContext('2d').drawImage(img, (MASTER_SIZE - w) / 2, (MASTER_SIZE - h) / 2, w, h);
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
  const res = await fetch('/api/exercises');
  if (!res.ok) {
    counter.textContent = `Counter: —`;
    list.innerHTML = `<p class="error">/api/exercises failed with ${res.status}. ${(await res.text()).trim()}</p>`;
    return;
  }
  exercises = await res.json();
  // Warnings describe an upload, not a stored file, so they live for the session only.
  for (const e of exercises) e.warnings = [null, null];
  collapseAll.textContent = collapsed.size >= exercises.length ? 'Expand all' : 'Collapse all';
  render();
})();
