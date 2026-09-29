import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';

import { DraggableCell } from '@/components/templates/draggable-cell';
import { FolderArt } from '@/components/templates/folder-art';
import { CARD_BORDER, cardSlot, COVER_SCALE, GridCard } from '@/components/templates/grid-card';
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

/** A folder's whole card art; a shared link's card is drawn from the same call. */
export function folderCover(folder: Pick<FolderCardData, 'color' | 'artwork'>, cardWidth: number) {
  return <FolderArt color={folder.color} artwork={folder.artwork} width={cardWidth * COVER_SCALE} />;
}

type Props = {
  folder: FolderCardData;
  width: number;
  index: number;
  draggable?: boolean;
  menu?: React.ReactNode;
};

// Two components rather than a conditional hook, as in TemplateCard: the
// draggable one needs the drag provider, which a folder sheet doesn't have.
export function FolderCard({ draggable = true, ...props }: Props) {
  if (draggable) return <DraggableFolderCard {...props} />;

  const cardWidth = props.width - CARD_BORDER * 2;
  return (
    <View style={[cardSlot, { width: props.width }]}>
      <FolderGridCard
        folder={props.folder}
        cardWidth={cardWidth}
        menu={props.menu}
        liftable={false}
      />
    </View>
  );
}

/** A folder both receives cards and reorders among the other folders. */
function DraggableFolderCard({ folder, width, index, menu }: Omit<Props, 'draggable'>) {
  const theme = useTheme();
  const drag = useTemplateDrag();
  const cardWidth = width - CARD_BORDER * 2;

  useEffect(() => drag.registerFolder(folder.id, index), [drag, folder.id, index]);

  // Paints the border the slot already reserves, so receiving shifts nothing.
  const highlight = useAnimatedStyle(() => ({
    borderColor: drag.hoveredFolderId.value === folder.id ? theme.accent : 'transparent',
  }));

  return (
    <DraggableCell id={folder.id} index={index} kind="folder" width={width} highlight={highlight}>
      <FolderGridCard folder={folder} cardWidth={cardWidth} menu={menu} liftable />
    </DraggableCell>
  );
}

function FolderGridCard({
  folder,
  cardWidth,
  menu,
  liftable,
}: {
  folder: FolderCardData;
  cardWidth: number;
  menu?: React.ReactNode;
  liftable: boolean;
}) {
  return (
    <GridCard
      width={cardWidth}
      title={folder.name}
      color={folder.color}
      showCover={false}
      menu={menu}
      liftable={liftable}
      onPress={() =>
        router.push({
          pathname: '/folder/[id]',
          params: { id: folder.id },
        })
      }
      cover={folderCover(folder, cardWidth)}
    />
  );
}
