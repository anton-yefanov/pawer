import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { TemplateEditor } from '@/components/templates/template-editor';
import { updateTemplate } from '@/lib/template-actions';
import { loadDraft, resetDraft } from '@/lib/template-draft';
import { templateExercisesQuery, templateQuery } from '@/lib/template-queries';

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: templateRows } = useLiveQuery(templateQuery(id), [id]);
  const { data: exercises } = useLiveQuery(templateExercisesQuery(id), [id]);

  const template = templateRows?.[0];
  const seeded = useRef(false);

  useEffect(() => resetDraft, []);

  // Seeded once: after this the draft is the user's, and the live queries would
  // otherwise keep overwriting their edits.
  useEffect(() => {
    if (seeded.current || !template || !exercises) return;
    seeded.current = true;
    loadDraft({
      templateId: template.id,
      name: template.name,
      exerciseIds: exercises.map((row) => row.exerciseId),
    });
  }, [template, exercises]);

  return (
    <TemplateEditor
      title="Edit Template"
      onSave={({ name, exerciseIds }) => updateTemplate({ id, name, exerciseIds })}
    />
  );
}
