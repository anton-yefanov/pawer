import { useSyncExternalStore } from 'react';

import { newId } from '@/db/id';
import { move } from '@/lib/order';
import type { SetType } from '@/lib/set-types';
import { joinPlan, leavePlan } from '@/lib/supersets';
import type { TemplateExerciseInput, TemplateSetInput } from '@/lib/template-actions';
import type { TrackedSet } from '@/lib/tracking-types';

/**
 * The in-progress New Template. It lives outside React because the exercise
 * picker is a sibling sheet route, not a child of the template screen, so there
 * is no shared component state to hang it on.
 *
 * Nothing is written to SQLite until Save, so cancelling a draft leaves no
 * soft-deleted rows behind. The ids are minted here rather than on save so a set
 * row has something stable to key off and mutate through before it exists.
 */

export type DraftSet = TemplateSetInput;

export type DraftExercise = TemplateExerciseInput & {
  sets: readonly DraftSet[];
};

export type TemplateDraft = {
  /** Set when editing an existing template, null while creating one. */
  templateId: string | null;
  name: string;
  exercises: readonly DraftExercise[];
};

const EMPTY: TemplateDraft = { templateId: null, name: '', exercises: [] };

let draft = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function blankSet(): DraftSet {
  return {
    id: newId(),
    weightKg: null,
    reps: null,
    durationSeconds: null,
    distanceM: null,
    setType: 'normal',
    notes: null,
  };
}

export function useTemplateDraft(): TemplateDraft {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => draft,
    () => draft
  );
}

export function resetDraft(): void {
  draft = EMPTY;
  emit();
}

export function loadDraft(next: TemplateDraft): void {
  draft = next;
  emit();
}

export function setDraftName(name: string): void {
  draft = { ...draft, name };
  emit();
}

function mapExercise(rowId: string, fn: (row: DraftExercise) => DraftExercise): void {
  draft = {
    ...draft,
    exercises: draft.exercises.map((row) => (row.id === rowId ? fn(row) : row)),
  };
  emit();
}

function mapSet(setId: string, fn: (set: DraftSet) => DraftSet): void {
  draft = {
    ...draft,
    exercises: draft.exercises.map((row) =>
      row.sets.some((set) => set.id === setId)
        ? {
            ...row,
            sets: row.sets.map((set) => (set.id === setId ? fn(set) : set)),
          }
        : row,
    ),
  };
  emit();
}

/** Ignores exercises already in the draft — the picker allows repeat visits. */
export function addDraftExercises(exerciseIds: readonly string[]): void {
  const existing = new Set(draft.exercises.map((row) => row.exerciseId));
  const added = exerciseIds.filter((id) => !existing.has(id));
  if (added.length === 0) return;
  draft = {
    ...draft,
    exercises: [
      ...draft.exercises,
      ...added.map((exerciseId) => ({
        id: newId(),
        exerciseId,
        restSeconds: null,
        notes: null,
        supersetId: null,
        sets: [blankSet()],
      })),
    ],
  };
  emit();
}

export function moveDraftExercise(from: number, to: number): void {
  draft = { ...draft, exercises: move(draft.exercises, from, to) };
  emit();
}

export function removeDraftExercise(rowId: string): void {
  draft = {
    ...draft,
    exercises: draft.exercises.filter((row) => row.id !== rowId),
  };
  emit();
}

export function joinDraftSuperset(rowId: string, targetRowId: string): void {
  const plan = joinPlan(draft.exercises, rowId, targetRowId);
  if (!plan) return;

  const members = new Set(plan.memberIds);
  const byId = new Map(
    draft.exercises.map((row) => [
      row.id,
      members.has(row.id) ? { ...row, supersetId: plan.supersetId } : row,
    ]),
  );
  draft = { ...draft, exercises: plan.orderedIds.map((id) => byId.get(id)!) };
  emit();
}

export function leaveDraftSuperset(rowId: string): void {
  const cleared = new Set(leavePlan(draft.exercises, rowId));
  if (cleared.size === 0) return;

  draft = {
    ...draft,
    exercises: draft.exercises.map((row) =>
      cleared.has(row.id) ? { ...row, supersetId: null } : row,
    ),
  };
  emit();
}

export function setDraftExerciseNotes(rowId: string, notes: string | null): void {
  mapExercise(rowId, (row) => ({ ...row, notes }));
}

export function setDraftExerciseRest(rowId: string, restSeconds: number | null): void {
  mapExercise(rowId, (row) => ({ ...row, restSeconds }));
}

/** Carries the last set's numbers forward, like `addSet` does in a workout. */
export function addDraftSet(rowId: string): void {
  mapExercise(rowId, (row) => {
    const last = row.sets[row.sets.length - 1];
    return {
      ...row,
      sets: [
        ...row.sets,
        last
          ? {
              ...last,
              id: newId(),
              setType: 'normal' as SetType,
              notes: null,
            }
          : blankSet(),
      ],
    };
  });
}

export function deleteDraftSet(setId: string): void {
  draft = {
    ...draft,
    exercises: draft.exercises.map((row) =>
      row.sets.some((set) => set.id === setId)
        ? { ...row, sets: row.sets.filter((set) => set.id !== setId) }
        : row,
    ),
  };
  emit();
}

export function updateDraftSetValues(setId: string, values: Partial<TrackedSet>): void {
  mapSet(setId, (set) => ({ ...set, ...values }));
}

export function setDraftSetType(setId: string, setType: SetType): void {
  mapSet(setId, (set) => ({ ...set, setType }));
}

export function setDraftSetNotes(setId: string, notes: string | null): void {
  mapSet(setId, (set) => ({ ...set, notes }));
}
