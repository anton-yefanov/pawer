import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';

import { folderActions } from '@/components/templates/card-actions';
import { CardMenu } from '@/components/templates/card-menu';
import { DraggableCell } from '@/components/templates/draggable-cell';
import { CARD_BORDER, GridCard } from '@/components/templates/grid-card';
import { useTemplateDrag } from '@/components/templates/template-drag';
import { useTheme } from '@/hooks/use-theme';

export type FolderCardData = {
  id: string;
  name: string;
  templateNames: readonly string[];
};

/** A folder both receives templates and reorders among the other folders. */
export function FolderCard({
  folder,
  width,
  index,
}: {
  folder: FolderCardData;
  width: number;
  index: number;
}) {
  const theme = useTheme();
  const drag = useTemplateDrag();
  const ref = useRef<View>(null);

  useEffect(() => drag.registerFolder(folder.id, ref), [drag, folder.id]);

  // Paints the border the slot already reserves, so receiving shifts nothing.
  const highlight = useAnimatedStyle(() => ({
    borderColor: drag.hoveredFolderId.value === folder.id ? theme.accent : 'transparent',
  }));

  return (
    <DraggableCell
      id={folder.id}
      index={index}
      kind="folder"
      width={width}
      cellRef={ref}
      highlight={highlight}>
      <GridCard
        width={width - CARD_BORDER * 2}
        title={folder.name}
        subtitle={
          folder.templateNames.length > 0
            ? folder.templateNames.join(', ')
            : 'Empty — drag a template here'
        }
        onPress={() =>
          router.push({
            pathname: '/workout/folder/[id]',
            params: { id: folder.id },
          })
        }
        menu={
          <CardMenu accessibilityLabel={`${folder.name} options`} actions={folderActions(folder)} />
        }
        cover={<SymbolView name="folder.fill" size={44} tintColor={theme.textSecondary} />}
      />
    </DraggableCell>
  );
}
