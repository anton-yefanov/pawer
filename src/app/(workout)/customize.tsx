import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';

import { ColorPicker } from '@/components/templates/color-picker';
import { asCardColor, type CardColor } from '@/constants/card-colors';
import { setFolderColor } from '@/lib/folder-actions';
import { setTemplateColor } from '@/lib/template-actions';
import { folderQuery, templateQuery } from '@/lib/template-queries';

export default function CustomizeScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind: 'template' | 'folder' }>();
  const isFolder = kind === 'folder';

  // Both queries run unconditionally — `kind` is fixed for a mounted sheet, and
  // one extra single-row read is cheaper than a conditional hook.
  const { data: templateRows } = useLiveQuery(templateQuery(id), [id]);
  const { data: folderRows } = useLiveQuery(folderQuery(id), [id]);
  const row = isFolder ? folderRows?.[0] : templateRows?.[0];

  const select = (color: CardColor) => {
    void (isFolder ? setFolderColor(id, color) : setTemplateColor(id, color));
    router.back();
  };

  return <ColorPicker selected={asCardColor(row?.color)} onSelect={select} />;
}
