import { useSyncExternalStore } from 'react';

import { move } from '@/lib/order';

/**
 * The in-progress New Template. It lives outside React because the exercise
 * picker is a sibling sheet route, not a child of the template screen, so there
 * is no shared component state to hang it on.
 *
 * Nothing is written to SQLite until Save, so cancelling a draft leaves no
 * soft-deleted rows behind.
 */

export type TemplateDraft = {
  /** Set when editing an existing template, null while creating one. */
  templateId: string | null;
  name: string;
  exerciseIds: readonly string[];
};

const EMPTY: TemplateDraft = { templateId: null, name: '', exerciseIds: [] };

let draft = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
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

/** Ignores exercises already in the draft — the picker allows repeat visits. */
export function addDraftExercises(exerciseIds: readonly string[]): void {
  const existing = new Set(draft.exerciseIds);
  const added = exerciseIds.filter((id) => !existing.has(id));
  if (added.length === 0) return;
  draft = { ...draft, exerciseIds: [...draft.exerciseIds, ...added] };
  emit();
}

export function moveDraftExercise(from: number, to: number): void {
  draft = { ...draft, exerciseIds: move(draft.exerciseIds, from, to) };
  emit();
}

export function removeDraftExercise(exerciseId: string): void {
  draft = { ...draft, exerciseIds: draft.exerciseIds.filter((id) => id !== exerciseId) };
  emit();
}
