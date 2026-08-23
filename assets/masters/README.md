# Image masters

Source-of-truth artwork. Nothing here ships in the app — `npm run build:images`
converts these into the WebP files under `assets/exercises/` and `assets/mascot/`
that the bundle actually contains.

Never hand-edit the generated WebP files. Change a master, re-run the script.

## Format

| | Exercises | Mascot | Attributes | Backgrounds | Template covers |
|---|---|---|---|---|---|
| Path | `masters/exercises/<slug>_1.png`, `<slug>_2.png` | `masters/mascot/<state>.png` | `masters/attributes/<kind>/<slug>.png` | `masters/backgrounds/<color>.png` | `masters/templates/<name>.png` |
| Size | 1200 × 1200 | 1024 × 1024 | 1024 × 1024 | square, ≥ 512 | square, ≥ 512 |
| Format | PNG, transparent background | PNG, transparent background | PNG, transparent background | PNG, opaque | PNG, transparent background |
| Colour | sRGB | sRGB | sRGB | sRGB | sRGB |

`<color>` is a member of `CARD_COLORS` in `src/constants/card-colors.ts` — the
card cover a template or folder is customized with.

`<name>` is the cat that sits on that cover, and it is one of two things: a
`TemplateBucket` in `src/lib/template-images.ts`, used when a template's image is
left on Auto, or a `CARD_POSES` id in `src/constants/card-poses.ts`, which the
user picks from the Customize sheet. A new pose is a master here plus one line in
each of those two files.

`<slug>` is the exercise's `sourceId` from `src/db/seed/exercises.json`
(e.g. `Barbell_Squat`) — 203 of them, two frames each.

`<state>` is a member of `MascotState` in `src/lib/mascot-images.ts`, or
`face-<face>` for a `MascotFace` head-only variant. Poses drawn but not mapped to
a state live in `masters/mascot/spare/`, which the build ignores — promote one by
moving it up a directory under a state name.

`<kind>` is `level`, `category`, `equipment` or `muscle`, and `<slug>` is the
attribute value with spaces replaced by `_` (`body only` → `body_only.png`).
The 35 values are listed in `scripts/attribute-vocabulary.mjs`, which is where
`build-images.mjs` gets its "unknown value" and "missing icon" warnings from.
They come straight out of `src/db/seed/exercises.json`, so a new equipment or
category value in the seed needs an icon here plus a line in
`src/lib/attribute-images.ts`.

## Output

`npm run build:images` writes lossy WebP at q85 with a lossless alpha channel:

| Output | Size | From |
|---|---|---|
| `assets/exercises/thumb/<slug>.webp` | 150 × 150 | frame 1 |
| `assets/exercises/detail/<slug>_1.webp` | 600 × 600 | frame 1 |
| `assets/exercises/detail/<slug>_2.webp` | 600 × 600 | frame 2 |
| `assets/mascot/<state>.webp` | 512 × 512 | master |
| `assets/attributes/<kind>/<slug>.webp` | 256 × 256 | master |
| `assets/backgrounds/<color>.webp` | 512 × 512 | master |
| `assets/templates/<name>.webp` | 512 × 512 | master |

WebP, never JPEG — JPEG has no alpha channel and its DCT compression smears the
crisp outlines this art style depends on.

## The one rule that matters

**Both frames of a pair must share the same bounding box.** Crop each frame to
its own tight box and the cat shifts a few pixels between them, so toggling
reads as a glitch rather than a rep. Lock the hips to a fixed point on the
canvas and let the limbs move around it — the placeholder generator in
`scripts/make-placeholder-masters.mjs` demonstrates this: hips sit at (500, 700)
on a 1000-unit grid in both frames, and only the arms differ.

Masters are square so the 150px thumbnail and the 600px detail image are the
same crop at two scales. Changing the detail display size later is a re-run of
the script, never a recommission.

Frame 1 is what appears as the list thumbnail, so it should be the pose with the
most distinctive silhouette — usually the stretched/bottom position. At 48pt,
silhouette is all the user has.

## Filling this directory

`tools/image-uploader/` is a page listing every exercise beside its two upstream
reference photos, with drop/paste slots that enforce the format table above
before storing the master. The 35 attribute icons sit in their own panel at the
top of that page, grouped by kind, with the same drop/paste/replace slots. It also shows how many exercises still need art and
previews the selected exercise in the app's detail layout (light and dark).

`npm run images:web` serves it from `tools/image-uploader/server.mjs` on
http://localhost:4000. A drop is written straight into this directory, so git is
the only store and one command ships it:

```bash
npm run build:images    # masters -> shipped WebP
```

## Placeholders

`npm run build:placeholders` regenerates the stand-in masters and their WebP
outputs. Every exercise currently resolves to the same `placeholder` pair via
`src/lib/exercise-images.ts`; replacing that function with a generated
require-map is the only code change real artwork needs. Nothing renders those
illustrations today — the exercise list and detail sheet show text and the four
attribute tiles instead.

The 35 attribute icons are tinted initials for now and are the one set the app
does render. They need no code change at all: drop a PNG on its slot in the
uploader (or overwrite the master directly), then `npm run build:images`.
