import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';

import { DraggableCell } from '@/components/templates/draggable-cell';
import { FolderArt } from '@/components/templates/folder-art';
import { CARD_BORDER, COVER_SCALE, GridCard } from '@/components/templates/grid-card';
import { useTemplateDrag } from '@/components/templates/template-drag';
import { type CardColor } from '@/constants/card-colors';
import { useTheme } from '@/hooks/use-theme';
import { type CardArtwork } from '@/lib/card-artwork';

export type FolderCardData = {
  id: string;
  name: string;
  color: CardColor | null;
  artwork: CardArtwork | null;
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
  const cardWidth = width - CARD_BORDER * 2;

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
        width={cardWidth}
        title={folder.name}
        color={folder.color}
        showCover={false}
        onPress={() =>
          router.push({
            pathname: '/folder/[id]',
            params: { id: folder.id },
          })
        }
        cover={
          <FolderArt
            color={folder.color}
            artwork={folder.artwork}
            width={cardWidth * COVER_SCALE}
          />
        }
      />
    </DraggableCell>
  );
}
