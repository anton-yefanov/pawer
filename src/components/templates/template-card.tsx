import { router } from 'expo-router';
import { View } from 'react-native';

import { ArtworkLayer } from '@/components/templates/artwork-layer';
import { DraggableCell } from '@/components/templates/draggable-cell';
import { CARD_BORDER, cardSlot, COVER_RATIO, GridCard } from '@/components/templates/grid-card';
import { type CardColor } from '@/constants/card-colors';
import { type CardArtwork } from '@/lib/card-artwork';
import { type ExerciseArt } from '@/lib/exercise-media';

export type TemplateCardData = {
  id: string;
  name: string;
  isBuiltIn: boolean;
  folderId: string | null;
  color: CardColor | null;
  artwork: CardArtwork | null;
  exerciseNames: readonly string[];
  exerciseArt: readonly ExerciseArt[];
};

type Props = {
  template: TemplateCardData;
  width: number;
  index: number;
  draggable?: boolean;
};

export function TemplateCard({ template, width, index, draggable = false }: Props) {
  const cardWidth = width - CARD_BORDER * 2;
  const card = (
    <GridCard
      width={cardWidth}
      title={template.name}
      color={template.color}
      subtitle={template.exerciseNames.join(', ')}
      onPress={() =>
        router.push({ pathname: '/template/[id]', params: { id: template.id } })
      }
      cover={
        <ArtworkLayer
          artwork={template.artwork}
          coverHeight={cardWidth * COVER_RATIO}
          exerciseArt={template.exerciseArt}
        />
      }
    />
  );

  // Two branches rather than a conditional hook. `draggable` is fixed per
  // section, so it never flips under a mounted card.
  return draggable ? (
    <DraggableCell id={template.id} index={index} kind="template" width={width}>
      {card}
    </DraggableCell>
  ) : (
    <View style={[cardSlot, { width }]}>{card}</View>
  );
}
