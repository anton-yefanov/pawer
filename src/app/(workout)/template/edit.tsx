import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { TemplateEditor } from '@/components/templates/template-editor';
import { setTypeOf } from '@/lib/set-types';
import { updateTemplate } from '@/lib/template-actions';
import { blankSet, loadDraft, resetDraft } from '@/lib/template-draft';
import { templateExercisesQuery, templateQuery, templateSetsQuery } from '@/lib/template-queries';
import { groupBy } from '@/lib/workout-queries';

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: templateRows } = useLiveQuery(templateQuery(id), [id]);
  const { data: exercises } = useLiveQuery(templateExercisesQuery(id), [id]);
  const { data: sets } = useLiveQuery(templateSetsQuery(id), [id]);

  const template = templateRows?.[0];
  const seeded = useRef(false);

  useEffect(() => resetDraft, []);

  // Seeded once: after this the draft is the user's, and the live queries would
  // otherwise keep overwriting their edits.
  useEffect(() => {
    // An empty array is a legitimate answer, so test for the query having run.
    if (seeded.current || !template || exercises === undefined || sets === undefined) return;
    seeded.current = true;

    const byExercise = groupBy(sets, (row) => row.templateExerciseId);

    loadDraft({
      templateId: template.id,
      name: template.name,
      exercises: exercises.map((row) => {
        const planned = byExercise.get(row.id) ?? [];
        return {
          id: row.id,
          exerciseId: row.exerciseId,
          restSeconds: row.restSeconds,
          notes: row.notes,
          // A template saved before planned sets existed has none to load.
          sets:
            planned.length > 0
              ? planned.map((set) => ({
                  id: set.id,
                  weightKg: set.weightKg,
                  reps: set.reps,
                  durationSeconds: set.durationSeconds,
                  distanceM: set.distanceM,
                  setType: setTypeOf(set.setType),
                  notes: set.notes,
                }))
              : [blankSet()],
        };
      }),
    });
  }, [template, exercises, sets]);

  return (
    <TemplateEditor
      title="Edit Template"
      onSave={({ name, exercises: rows }) => updateTemplate({ id, name, exercises: rows })}
    />
  );
}
