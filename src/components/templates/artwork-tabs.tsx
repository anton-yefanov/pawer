import { StyleSheet, View } from "react-native";

import {
  ExerciseTabs,
  type ExerciseTab,
} from "@/components/exercises/exercise-tabs";
import { Spacing } from "@/constants/theme";
import { t } from "@/i18n";

export type ArtworkMode = "exercises" | "emoji" | "media";

const TABS: readonly ExerciseTab[] = [
  { id: "exercises", label: t("templates:tab.exercises") },
  { id: "emoji", label: t("templates:tab.emoji") },
  { id: "media", label: t("templates:tab.media") },
];

/** Picks which of the three sources the cover draws from, and so what the
 *  customize sheet's body offers. Each tab keeps its own draft, so switching
 *  away and back loses nothing. */
export function ArtworkTabs({
  mode,
  onChange,
}: {
  mode: ArtworkMode;
  onChange: (mode: ArtworkMode) => void;
}) {
  return (
    <View style={styles.row}>
      <ExerciseTabs
        tabs={TABS}
        value={mode}
        onChange={(id) => onChange(id as ArtworkMode)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
