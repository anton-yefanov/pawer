import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { ExerciseFormSheet } from '@/components/exercises/exercise-form-sheet';
import { db } from '@/db/client';
import { exercises } from '@/db/schema';

export function EditExerciseSheet({ id }: { id: string }) {
  const { data } = useLiveQuery(
    db.select().from(exercises).where(eq(exercises.id, id)).limit(1),
    [id],
  );
  const exercise = data?.[0];

  return exercise ? <ExerciseFormSheet exercise={exercise} /> : null;
}
