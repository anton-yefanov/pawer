/**
 * Search vocabulary for the bundled library, consumed by build-exercise-seed.mjs
 * and stored as `exercises.tags`.
 *
 * Upstream names the exercises; people search with muscles, equipment and slang.
 * Rules cover what the existing columns already imply, aliases cover what no
 * column can — abbreviations ("RDL", "OHP") and gym words ("skullcrusher",
 * "pec deck", "ab wheel").
 *
 * A tag whose letters already appear in the name is dropped: search collapses
 * spaces on both sides, so "lat pulldown" finds "Wide-Grip Lat Pulldown"
 * unaided. What survives is exactly what the name does not say.
 */

const MUSCLE_TAGS = {
  abdominals: ['abs', 'core', 'stomach', 'obliques', 'six pack'],
  abductors: ['outer thigh', 'hips', 'legs'],
  adductors: ['inner thigh', 'groin', 'legs'],
  biceps: ['bis', 'arms'],
  calves: ['calf', 'legs'],
  chest: ['pecs', 'pectorals'],
  forearms: ['grip', 'arms'],
  glutes: ['butt', 'bum', 'legs'],
  hamstrings: ['hams', 'legs'],
  lats: ['back', 'latissimus'],
  'lower back': ['back', 'spine', 'erectors'],
  'middle back': ['back', 'rhomboids'],
  neck: ['neck'],
  quadriceps: ['quads', 'legs', 'thighs'],
  shoulders: ['delts', 'deltoids'],
  traps: ['trapezius', 'back'],
  triceps: ['tris', 'arms'],
};

const EQUIPMENT_TAGS = {
  barbell: ['bb'],
  bands: ['band', 'resistance band'],
  'body only': ['bodyweight', 'no equipment', 'home'],
  cable: ['pulley', 'cables'],
  dumbbell: ['db', 'dumbell'],
  'e-z curl bar': ['ez bar', 'curl bar'],
  'exercise ball': ['swiss ball', 'stability ball'],
  'foam roll': ['foam roller'],
  kettlebells: ['kettlebell', 'kb'],
  machine: ['gym machine'],
  'medicine ball': ['med ball'],
};

const CATEGORY_TAGS = {
  cardio: ['cardio', 'conditioning'],
  'olympic weightlifting': ['olympic lift', 'oly'],
  plyometrics: ['plyo', 'explosive', 'jump'],
  stretching: ['stretch', 'mobility', 'warm up'],
  strongman: ['strongman'],
};

/** Movement patterns, matched against the normalized name. */
const PATTERN_TAGS = [
  [/\b(press|push)\b|pushup|pushdown/, ['push']],
  [/\b(row|rows|pull|chin)\b|pulldown|pullup|pullover/, ['pull']],
  [/deadlift|good morning|swing|hip thrust|hyperextension|back extension|pull through/, ['hinge']],
  [/squat|lunge|leg press|step up/, ['legs']],
  [/\b(raise|fly|flyes|kickback|extension|curl)\b/, ['isolation']],
  [/plank|bridge|superman|hold/, ['stability']],
  [/\bone arm\b|single leg|pistol|concentration|one legged/, ['unilateral', 'single arm', 'single leg']],
];

const ALIASES = {
  Ab_Crunch_Machine: ['machine crunch'],
  Ab_Roller: ['ab wheel', 'rollout'],
  Air_Bike: ['bicycle crunch', 'bicycle kicks'],
  Arnold_Dumbbell_Press: ['arnold press', 'overhead press', 'ohp'],
  'Band_Assisted_Pull-Up': ['banded pull up'],
  'Barbell_Bench_Press_-_Medium_Grip': ['flat bench', 'bench press'],
  Barbell_Curl: ['bicep curl', 'ez bar curl'],
  Barbell_Deadlift: ['dl', 'conventional deadlift'],
  Barbell_Hack_Squat: ['behind the back squat'],
  Barbell_Hip_Thrust: ['glute bridge'],
  'Barbell_Incline_Bench_Press_-_Medium_Grip': ['incline bench'],
  Barbell_Lunge: ['walking lunge', 'split squat'],
  Barbell_Shoulder_Press: ['overhead press', 'ohp', 'military press', 'strict press'],
  Barbell_Squat: ['back squat', 'high bar squat'],
  Battling_Ropes: ['battle ropes', 'rope waves'],
  Bench_Dips: ['tricep dips'],
  Bent_Over_Barbell_Row: ['pendlay row', 'bor'],
  'Bent_Over_Two-Dumbbell_Row': ['db row'],
  Bicycling: ['cycling', 'bike', 'ride'],
  Bicycling_Stationary: ['exercise bike', 'spin bike', 'cycling'],
  Bodyweight_Squat: ['air squat'],
  Butt_Lift_Bridge: ['glute bridge', 'hip bridge'],
  Butterfly: ['pec deck', 'pec fly', 'chest fly', 'machine fly'],
  Cable_Chest_Press: ['cable press'],
  Cable_Crossover: ['cable fly', 'chest fly'],
  Cable_Crunch: ['kneeling cable crunch', 'rope crunch'],
  'Cable_Hammer_Curls_-_Rope_Attachment': ['rope curl', 'neutral grip curl'],
  Cable_Rear_Delt_Fly: ['reverse fly', 'rear delt'],
  Cable_Rope_Overhead_Triceps_Extension: ['tricep extension', 'french press'],
  Cable_Seated_Lateral_Raise: ['side raise', 'lat raise'],
  Cable_Shoulder_Press: ['overhead press', 'ohp'],
  'Chin-Up': ['underhand pull up'],
  Clean_and_Jerk: ['olympic lift'],
  Clean: ['olympic lift'],
  'Close-Grip_Barbell_Bench_Press': ['cgbp', 'close grip bench', 'tricep press'],
  Concentration_Curls: ['bicep curl'],
  Crunches: ['crunch', 'sit up'],
  Deadlift_with_Bands: ['banded deadlift'],
  Decline_Barbell_Bench_Press: ['decline bench'],
  Decline_Dumbbell_Bench_Press: ['decline bench'],
  'Dips_-_Chest_Version': ['chest dip', 'parallel bar dips'],
  'Dips_-_Triceps_Version': ['tricep dip', 'parallel bar dips'],
  Dumbbell_Bench_Press: ['db bench', 'flat dumbbell press'],
  Dumbbell_Bicep_Curl: ['db curl'],
  Dumbbell_Flyes: ['chest fly', 'db fly'],
  Dumbbell_Lunges: ['walking lunge', 'split squat'],
  Dumbbell_Shoulder_Press: ['overhead press', 'ohp'],
  Dumbbell_Side_Bend: ['oblique bend'],
  Dumbbell_Step_Ups: ['box step up'],
  Elliptical_Trainer: ['cross trainer'],
  Exercise_Ball_Crunch: ['swiss ball crunch', 'stability ball crunch'],
  Fast_Skipping: ['jump rope', 'skip rope'],
  'Flat_Bench_Leg_Pull-In': ['knee tuck', 'leg tuck'],
  Flat_Bench_Lying_Leg_Raise: ['leg lift'],
  Floor_Press: ['chest press'],
  Freehand_Jump_Squat: ['jump squat'],
  Front_Box_Jump: ['box jump'],
  Front_Plate_Raise: ['front raise'],
  Glute_Ham_Raise: ['ghr', 'nordic curl', 'hamstring curl'],
  Glute_Kickback: ['donkey kick'],
  Goblet_Squat: ['kettlebell squat'],
  Good_Morning: ['gm', 'hinge'],
  Hammer_Curls: ['neutral grip curl', 'bicep curl'],
  'Handstand_Push-Ups': ['hspu'],
  Hanging_Leg_Raise: ['hanging knee raise'],
  Hyperextensions_Back_Extensions: ['roman chair', 'hyper', 'lower back raise'],
  Incline_Cable_Chest_Press: ['incline press'],
  Incline_Dumbbell_Curl: ['bicep curl'],
  Incline_Dumbbell_Flyes: ['chest fly'],
  Incline_Dumbbell_Press: ['incline bench'],
  Inverted_Row: ['australian pull up', 'body row', 'trx row'],
  'Jackknife_Sit-Up': ['v up'],
  Kettlebell_Sumo_High_Pull: ['high pull'],
  Kettlebell_Thruster: ['thruster'],
  'Kettlebell_Turkish_Get-Up_Squat_style': ['tgu'],
  Knee_Hip_Raise_On_Parallel_Bars: ['captains chair', 'leg raise'],
  Lateral_Box_Jump: ['side box jump'],
  'Lateral_Raise_-_With_Bands': ['side raise', 'shoulder raise'],
  Leg_Extensions: ['quad extension', 'knee extension'],
  Leverage_Chest_Press: ['hammer strength', 'machine chest press'],
  Leverage_Deadlift: ['hammer strength', 'machine deadlift'],
  Leverage_Incline_Chest_Press: ['hammer strength'],
  Leverage_Iso_Row: ['hammer strength', 'machine row'],
  Leverage_Shoulder_Press: ['hammer strength', 'overhead press', 'ohp'],
  Leverage_Shrug: ['hammer strength', 'machine shrug'],
  'Lying_Close-Grip_Barbell_Triceps_Extension_Behind_The_Head': [
    'skullcrusher',
    'skull crusher',
    'french press',
  ],
  Lying_Dumbbell_Tricep_Extension: ['skullcrusher', 'skull crusher'],
  Lying_Leg_Curls: ['hamstring curl'],
  Machine_Bicep_Curl: ['bicep curl'],
  Machine_Preacher_Curls: ['bicep curl'],
  Machine_Shoulder_Military_Press: ['overhead press', 'ohp'],
  Machine_Triceps_Extension: ['tricep extension', 'pushdown'],
  Mountain_Climbers: ['climbers'],
  Muscle_Up: ['bar muscle up'],
  Oblique_Crunches: ['side crunch'],
  'One-Arm_Dumbbell_Row': ['db row', 'single arm row'],
  'One-Arm_High-Pulley_Cable_Side_Bends': ['oblique bend'],
  'One-Arm_Kettlebell_Swings': ['kb swing', 'kettlebell swing'],
  Overhead_Slam: ['ball slam', 'slam ball'],
  Plank: ['front plank', 'core hold'],
  Power_Clean: ['olympic lift'],
  Power_Snatch: ['olympic lift'],
  Preacher_Curl: ['bicep curl', 'ez bar curl'],
  Pull_Through: ['cable pull through'],
  Push_Press: ['overhead press', 'ohp'],
  Pushups: ['press up'],
  Rack_Pulls: ['partial deadlift', 'block pull'],
  Reverse_Barbell_Curl: ['forearm curl'],
  Reverse_Flyes: ['rear delt'],
  'Reverse_Grip_Bent-Over_Rows': ['yates row', 'underhand row'],
  Reverse_Hyperextension: ['reverse hyper'],
  Reverse_Machine_Flyes: ['reverse pec deck', 'rear delt fly'],
  Romanian_Deadlift: ['rdl', 'stiff leg deadlift'],
  Rope_Jumping: ['jump rope', 'skipping', 'skip rope'],
  Rowing_Stationary: ['rowing machine', 'erg', 'concept 2'],
  Running_Treadmill: ['run', 'jog'],
  Russian_Twist: ['oblique twist'],
  Seated_Barbell_Military_Press: ['overhead press', 'ohp'],
  Seated_Cable_Rows: ['low row'],
  'Seated_Dumbbell_Palms-Up_Wrist_Curl': ['forearm curl'],
  Seated_Dumbbell_Press: ['shoulder press', 'overhead press', 'ohp'],
  Seated_Leg_Curl: ['hamstring curl'],
  Side_Bridge: ['side plank'],
  Side_Lateral_Raise: ['lat raise', 'delt raise'],
  Single_Leg_Glute_Bridge: ['hip thrust'],
  'Sit-Up': ['crunch'],
  Skating: ['ice skating', 'skate'],
  Smith_Machine_Overhead_Shoulder_Press: ['ohp', 'military press'],
  Smith_Machine_Pistol_Squat: ['single leg squat'],
  Snatch_Pull: ['olympic lift'],
  Snatch: ['olympic lift'],
  Split_Jerk: ['olympic lift'],
  'Squats_-_With_Bands': ['banded squat'],
  Standing_Biceps_Cable_Curl: ['bicep curl'],
  Standing_Dumbbell_Reverse_Curl: ['forearm curl'],
  Standing_Dumbbell_Triceps_Extension: ['overhead tricep extension'],
  Standing_Front_Barbell_Raise_Over_Head: ['front raise'],
  Standing_Military_Press: ['overhead press', 'ohp', 'strict press'],
  Standing_Overhead_Barbell_Triceps_Extension: ['french press'],
  'Stiff-Legged_Barbell_Deadlift': ['sldl', 'straight leg deadlift', 'rdl'],
  'Stiff-Legged_Dumbbell_Deadlift': ['sldl', 'straight leg deadlift', 'rdl'],
  'Straight-Arm_Dumbbell_Pullover': ['lat pullover'],
  'Straight-Arm_Pulldown': ['lat pulldown'],
  Sumo_Deadlift: ['sumo dl'],
  Superman: ['back extension'],
  Thigh_Abductor: ['hip abduction', 'outer thigh machine'],
  Thigh_Adductor: ['hip adduction', 'inner thigh machine'],
  Torso_Rotation: ['oblique twist', 'russian twist'],
  Trail_Running_Walking: ['run', 'jog', 'hike'],
  Trap_Bar_Deadlift: ['hex bar deadlift'],
  Underhand_Cable_Pulldowns: ['reverse grip pulldown', 'lat pulldown'],
  Walking_Treadmill: ['walk'],
  'Wide-Grip_Barbell_Bench_Press': ['bench press'],
  'Wide-Grip_Rear_Pull-Up': ['behind the neck pull up'],
  Wrist_Roller: ['forearm roller'],
  Zercher_Squats: ['front loaded squat'],
  'x_Assisted_Chin-Up_Machine': ['gravitron', 'assisted chinup'],
  'x_Assisted_Pull-Up_Machine': ['gravitron', 'assisted pullup'],
};

const collapse = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

export function tagsFor(exercise) {
  const name = exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const tags = new Set();

  for (const muscle of exercise.primaryMuscles ?? []) {
    for (const tag of MUSCLE_TAGS[muscle] ?? []) tags.add(tag);
  }
  for (const tag of EQUIPMENT_TAGS[exercise.equipment] ?? []) tags.add(tag);
  for (const tag of CATEGORY_TAGS[exercise.category] ?? []) tags.add(tag);
  for (const [pattern, patternTags] of PATTERN_TAGS) {
    if (pattern.test(name)) for (const tag of patternTags) tags.add(tag);
  }
  for (const tag of ALIASES[exercise.id] ?? []) tags.add(tag);

  const collapsedName = collapse(exercise.name);
  return [...tags].filter((tag) => !collapsedName.includes(collapse(tag))).sort();
}

/** Alias keys that match no exercise — a typo'd slug would silently do nothing. */
export function unknownAliasIds(seenIds) {
  return Object.keys(ALIASES).filter((id) => !seenIds.has(id));
}
