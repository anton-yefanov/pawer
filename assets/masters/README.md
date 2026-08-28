# Image masters

Source-of-truth artwork. Nothing here ships in the app — `npm run build:images`
converts these into the WebP files under `assets/mascot/` that the bundle
actually contains.

Never hand-edit the generated WebP files. Change a master, re-run the script.

Exercise art is no longer here. The library's stills and clips come from the
purchased set in `assets/new_exercises_data/`; see CLAUDE.md §Assets.

## Format

| | Mascot |
|---|---|
| Path | `masters/mascot/<state>.png` |
| Size | 1024 × 1024 |
| Format | PNG, transparent background |
| Colour | sRGB |

`<state>` is a member of `MascotState` in `src/lib/mascot-images.ts`, or
`face-<face>` for a `MascotFace` head-only variant. Poses drawn but not mapped to
a state live in `masters/mascot/spare/`, which the build ignores — promote one by
moving it up a directory under a state name.

## Why PNG in, WebP out

PNG keeps the master lossless and editable. The shipped WebP is lossy q85 with a
lossless alpha channel: about half the size of an optimised PNG, decoded natively
by `expo-image`, and unlike JPEG it keeps transparency and does not smear crisp
outlines.

Resizing the shipped assets later is a re-run of the script, never a re-crop.
