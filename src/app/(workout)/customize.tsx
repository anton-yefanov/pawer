import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CIRCLE_BUTTON_SIZE } from '@/components/circle-button';
import { SheetGrabber } from '@/components/sheet-grabber';
import { ColorPicker } from '@/components/templates/color-picker';
import { PosePicker } from '@/components/templates/pose-picker';
import { CloseButton, HeaderPillButton } from '@/components/workout/workout-sheet-header';
import { asCardColor, type CardColor } from '@/constants/card-colors';
import { asCardPose, type CardPose } from '@/constants/card-poses';
import { SHEET_BOTTOM_INSET, SHEET_SCROLL, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { cardBackground } from '@/lib/card-backgrounds';
import { setFolderColor } from '@/lib/folder-actions';
import { setTemplateAppearance } from '@/lib/template-actions';
import { templateCover } from '@/lib/template-images';
import { folderQuery, templateExercisesQuery, templateQuery } from '@/lib/template-queries';

export default function CustomizeScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind: 'template' | 'folder' }>();
  const isFolder = kind === 'folder';

  // Both queries run unconditionally — `kind` is fixed for a mounted sheet, and
  // one extra single-row read is cheaper than a conditional hook.
  const { data: templateRows } = useLiveQuery(templateQuery(id), [id]);
  const { data: folderRows } = useLiveQuery(folderQuery(id), [id]);
  const { data: exerciseRows } = useLiveQuery(templateExercisesQuery(id), [id]);
  const row = isFolder ? folderRows?.[0] : templateRows?.[0];

  // `undefined` is "untouched, use the row" — `null` is a real image value, so
  // it can't stand in for it. The draft is what Save writes; nothing else does.
  const [pickedColor, setPickedColor] = useState<CardColor | undefined>(undefined);
  const [pickedImage, setPickedImage] = useState<CardPose | null | undefined>(undefined);
  const color = pickedColor ?? asCardColor(row?.color);
  const image = pickedImage === undefined ? asCardPose(templateRows?.[0]?.image) : pickedImage;

  const primaryMuscles = exerciseRows?.flatMap((e) => e.primaryMuscles) ?? [];

  if (isFolder) {
    const select = (next: CardColor) => {
      void setFolderColor(id, next);
      router.back();
    };
    return (
      <View style={styles.content}>
        <SheetGrabber />
        <ColorPicker selected={color} onSelect={select} />
      </View>
    );
  }

  const save = () => {
    void setTemplateAppearance(id, color, image);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ sheetAllowedDetents: [1] }} />
      <SheetGrabber />
      <ScrollView {...SHEET_SCROLL} contentContainerStyle={styles.content}>
        <View style={styles.preview}>
          <View style={styles.cover}>
            <Image
              source={cardBackground(color)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <Image
              source={templateCover(image, primaryMuscles)}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
            />
          </View>
        </View>
        <ColorPicker selected={color} onSelect={setPickedColor} />
        <PosePicker
          selected={image}
          color={color}
          primaryMuscles={primaryMuscles}
          onSelect={setPickedImage}
        />
      </ScrollView>
      {/* Where Close and Finish sit on the workout sheet. This sheet draws no
          nav bar, so the buttons are placed rather than handed to one. */}
      <View style={styles.close}>
        <CloseButton onPress={() => router.back()} />
      </View>
      <View style={styles.save}>
        <HeaderPillButton title="Save" onPress={save} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: SHEET_TOP_INSET,
    paddingBottom: SHEET_BOTTOM_INSET + Spacing.two,
  },
  // Clears the Save pill by the same gap a section title leaves below itself,
  // so the preview sits evenly between the button and the Color card.
  preview: {
    paddingTop: CIRCLE_BUTTON_SIZE + Spacing.four,
  },
  // The card's cover alone — same proportions and corner as a real card, with
  // the name and exercise list left off. As wide as the cards below it.
  cover: {
    marginHorizontal: Spacing.three,
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  close: {
    position: 'absolute',
    top: SHEET_TOP_INSET,
    left: Spacing.three,
  },
  save: {
    position: 'absolute',
    top: SHEET_TOP_INSET,
    right: Spacing.three,
  },
});
