import { useEffect } from 'react';

import { TemplateEditor } from '@/components/templates/template-editor';
import { createTemplate } from '@/lib/template-actions';
import { resetDraft } from '@/lib/template-draft';

export default function NewTemplateScreen() {
  useEffect(() => resetDraft, []);

  return (
    <TemplateEditor
      title="New Template"
      onSave={({ name, exerciseIds }) => createTemplate({ name, exerciseIds }).then(() => undefined)}
    />
  );
}
