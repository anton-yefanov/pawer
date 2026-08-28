/**
 * The search vocabulary written into `exercises.tags`, consumed only by
 * build-exercise-seed.mjs.
 *
 * The vendor already ships per-exercise `tags` and `aliases`; what it does not
 * ship is gym slang. Add abbreviations and nicknames here rather than to an
 * exercise name — the name is what the row renders, the tags are only ever
 * matched against.
 */

/** Slang for a movement, keyed by a pattern over the normalized name. */
const PATTERN_TAGS = [
  [/romanian deadlift/, ['rdl', 'stiff leg deadlift', 'sldl']],
  [/\b(pec|chest) fly\b/, ['pec deck', 'chest flye']],
  [/skullcrusher/, ['skull crusher', 'lying tricep extension']],
  [/overhead press/, ['ohp', 'shoulder press', 'military press']],
  [/bulgarian split squat/, ['bss', 'rear foot elevated split squat', 'rfess']],
  [/lat pulldown/, ['pulldown', 'lat pull down']],
  [/lateral raise/, ['side raise', 'side delt raise']],
  [/rear delt/, ['reverse fly', 'rear deltoid']],
  [/good mornings/, ['gm', 'barbell good morning']],
  [/bench press/, ['bench']],
  [/pull ups|pull-up/, ['pullup', 'chin up']],
  [/push up/, ['pushup', 'press up']],
  [/hip thrust/, ['glute thrust', 'barbell thrust']],
  [/face pull/, ['rear delt pull']],
  [/tricep (extension|kickback)/, ['tricep', 'triceps']],
  [/preacher curl/, ['scott curl']],
  [/farmers carry/, ['loaded carry', 'suitcase carry']],
  [/turkish get-up/, ['tgu', 'get up']],
  [/jefferson curl/, ['spinal flexion']],
];

/** Per-exercise slang that no pattern earns. Keyed on the vendor slug. */
const ALIASES = {
  'barbell-deadlift': ['conventional deadlift'],
  'barbell-squat': ['back squat'],
  'machine-hack-squat': ['hack squat machine'],
  'machine-pec-fly': ['pec deck', 'butterfly'],
  'cable-pec-fly': ['cable crossover', 'crossover'],
  'cable-high-to-low-fly': ['cable crossover', 'high cable crossover'],
  'cable-low-to-high-fly': ['low cable crossover'],
  'front-plank': ['plank'],
  'hand-plank': ['high plank', 'plank'],
  'elbow-side-plank': ['side plank'],
  'assault-bike': ['air bike', 'echo bike', 'fan bike'],
  'ski-erg': ['skierg'],
  'machine-crunch': ['ab crunch machine'],
  'kneeling-cable-crunch': ['cable crunch', 'rope crunch'],
  'captains-chair-knee-raise': ['captains chair', 'knee raise'],
  'trap-bar-deadlift': ['hex bar deadlift'],
  'ez-bar-preacher-curl': ['ez curl bar'],
  'good-mornings': ['good morning'],
  'wall-sit': ['wall squat'],
  'dead-hang': ['bar hang'],
};

const normalize = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const collapse = (value) => normalize(value).replace(/ /g, '');

/**
 * Everything worth searching for that the name does not already say. A tag
 * whose letters already appear in the collapsed name is dropped: it can only
 * ever match when the name does, so it is dead weight in `search_text`.
 */
export function tagsFor(entry) {
  const name = collapse(entry.name);
  const tags = new Set([...entry.tags, ...entry.aliases]);

  for (const [pattern, slang] of PATTERN_TAGS) {
    if (pattern.test(normalize(entry.name))) for (const tag of slang) tags.add(tag);
  }
  for (const tag of ALIASES[entry.slug] ?? []) tags.add(tag);

  return [...tags]
    .map(normalize)
    .filter((tag) => tag !== '' && !name.includes(collapse(tag)))
    .sort();
}

export function unknownAliasIds(known) {
  return Object.keys(ALIASES).filter((slug) => !known.has(slug));
}
