import { useLocalSearchParams } from 'expo-router';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { TemplateEditor } from '@/components/templates/template-editor';
import { setTypeOf } from '@/lib/set-types';
import { updateTemplate } from '@/lib/template-actions';
import { blankSet, loadDraft, resetDraft } from '@/lib/template-draft';
import { templateExercisesQuery, templateQuery, templateSetsQuery } from '@/lib/template-queries';
import { useLiveRows } from '@/lib/use-live-rows';
import { groupBy } from '@/lib/workout-queries';

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const templateRows = useLiveRows(() => templateQuery(id), id);
  const exercises = useLiveRows(() => templateExercisesQuery(id), id);
  const sets = useLiveRows(() => templateSetsQuery(id), id);

  const template = templateRows?.[0];
  const seeded = useRef(false);

  useEffect(() => resetDraft, []);

  // Seeded once: after this the draft is the user's, and the live queries would
  // otherwise keep overwriting their edits. A layout effect, so the editor's
  // first painted frame already has the exercises — the rows are read
  // synchronously during render, and waiting for a passive effect would give
  // Android's sheet a frame of empty content to animate in.
  useLayoutEffect(() => {
    if (seeded.current || !template) return;
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
          supersetId: row.supersetId,
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
