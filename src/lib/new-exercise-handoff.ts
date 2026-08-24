/**
 * Hands a just-created custom exercise from the Add Exercise sheet back to the
 * library underneath it, which then opens its Custom section and — in a picker
 * — selects the row. The sheet is a sibling route in the same stack, so there
 * is no shared state and nothing to pass through `router.back()`.
 *
 * Claiming clears the id, and the library only claims while it is focused, so
 * a second library mounted in another stack never picks it up.
 */
let pending: string | null = null;

export function announceCustomExercise(id: string): void {
  pending = id;
}

export function claimCustomExercise(): string | null {
  const id = pending;
  pending = null;

  return id;
}
