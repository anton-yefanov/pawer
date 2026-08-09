import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { templateActions } from '@/components/templates/card-actions';
import { CardMenu } from '@/components/templates/card-menu';
import { DraggableCell } from '@/components/templates/draggable-cell';
import { CARD_BORDER, cardSlot, GridCard } from '@/components/templates/grid-card';
import { templateBucket, templateImage } from '@/lib/template-images';

export type TemplateCardData = {
  id: string;
  name: string;
  isBuiltIn: boolean;
  folderId: string | null;
  exerciseNames: readonly string[];
  primaryMuscles: readonly string[];
};

type Props = {
  template: TemplateCardData;
  width: number;
  index: number;
  draggable?: boolean;
};

export function TemplateCard({ template, width, index, draggable = false }: Props) {
  const card = (
    <GridCard
      width={width - CARD_BORDER * 2}
      title={template.name}
      subtitle={template.exerciseNames.join(', ')}
      onPress={() =>
        router.push({ pathname: '/workout/template/[id]', params: { id: template.id } })
      }
      menu={
        <CardMenu
          accessibilityLabel={`${template.name} options`}
          actions={templateActions(template)}
        />
      }
      cover={
        <Image
          source={templateImage(templateBucket(template.primaryMuscles))}
          style={styles.cover}
          contentFit="cover"
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

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    height: '100%',
  },
});
