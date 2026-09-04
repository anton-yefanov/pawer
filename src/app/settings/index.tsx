import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";

import {
  Card,
  DisclosureRow,
  Separator,
  TILE_INSET,
} from "@/components/grouped-list";
import { IconTile } from "@/components/icon-tile";
import { ToggleRow } from "@/components/settings/toggle-row";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { openReview } from "@/lib/app-store-review";
import { useAutofillWeightPreference } from "@/lib/autofill-weight";
import {
  openLegalDocument,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from "@/lib/legal";
import {
  FINISH_REMINDER_OPTIONS,
  useFinishReminder,
} from "@/lib/finish-reminder";
import { notice } from "@/lib/notice";
import { presentCustomerCenter, presentPaywall } from "@/lib/paywall";
import { PRO_NAME, usePurchases } from "@/lib/purchases";
import { THEME_PREFERENCES, useThemePreference } from "@/lib/theme-preference";
import { useWarmupStatsPreference } from "@/lib/warmup-stats";
import { useWeightUnit } from "@/lib/weight-unit";
import { attempt } from "@/lib/observability";

const RESTORE_MESSAGES = {
  restored: `Your purchase is back. ${PRO_NAME} is unlocked.`,
  nothing: "No previous purchase was found on this account.",
} as const;

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference } = useThemePreference();
  const unit = useWeightUnit();
  const { enabled: autofillWeight, setEnabled: setAutofillWeight } =
    useAutofillWeightPreference();
  const { enabled: includeWarmup, setEnabled: setIncludeWarmup } =
    useWarmupStatsPreference();
  const { option: finishReminder } = useFinishReminder();
  const { isPro, restore } = usePurchases();
  const onRestorePressed = async () => {
    const result = await restore();
    notice({
      title: PRO_NAME,
      message:
        result.status === "error"
          ? result.message
          : RESTORE_MESSAGES[result.status],
    });
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Card>
        <DisclosureRow
          label="Dark Theme"
          leading={<IconTile name="moon.fill" tint="indigo" />}
          value={
            THEME_PREFERENCES.find((option) => option.id === preference)?.short
          }
          chevron={false}
          onPress={() => router.push("/settings/theme")}
        />
        <Separator inset={TILE_INSET} />
        <DisclosureRow
          label="Weight Unit"
          leading={<IconTile name="dumbbell" tint="blue" />}
          value={unit}
          chevron={false}
          onPress={() => router.push("/settings/weight-unit")}
        />
        <Separator inset={TILE_INSET} />
        <ToggleRow
          label="Autofill Weight"
          leading={<IconTile name="wand.and.stars" tint="purple" />}
          value={autofillWeight}
          onChange={setAutofillWeight}
        />
        <Separator inset={TILE_INSET} />
        <ToggleRow
          label="Include Warmup in Stats"
          leading={<IconTile name="flame.fill" tint="yellow" />}
          value={includeWarmup}
          onChange={setIncludeWarmup}
        />
        <Separator inset={TILE_INSET} />
        <DisclosureRow
          label="Finish Reminder"
          leading={<IconTile name="timer" tint="orange" />}
          value={
            FINISH_REMINDER_OPTIONS.find(
              (option) => option.id === finishReminder,
            )?.short
          }
          chevron={false}
          onPress={() => router.push("/settings/finish-reminder")}
        />
        <Separator inset={TILE_INSET} />
        <DisclosureRow
          label="Privacy Policy"
          leading={<IconTile name="lock.fill" tint="blue" />}
          onPress={() =>
            void attempt("settings", openLegalDocument(PRIVACY_POLICY_URL), {
              title: "Couldn’t open Privacy Policy",
              message: "Please try again.",
            })
          }
        />
        <Separator inset={TILE_INSET} />
        <DisclosureRow
          label="Terms of Service"
          leading={<IconTile name="doc.badge.plus" tint="indigo" />}
          onPress={() =>
            void attempt("settings", openLegalDocument(TERMS_OF_SERVICE_URL), {
              title: "Couldn’t open Terms of Service",
              message: "Please try again.",
            })
          }
        />
        <Separator inset={TILE_INSET} />
        <DisclosureRow
          label="Support"
          leading={<IconTile name="questionmark.circle.fill" tint="teal" />}
          onPress={() => router.push("/settings/support")}
        />
        <Separator inset={TILE_INSET} />
        <DisclosureRow
          label="Rate Pawer on App Store"
          leading={<IconTile name="star.fill" tint="yellow" />}
          onPress={() => void openReview()}
        />
        <Separator inset={TILE_INSET} />
        {isPro ? (
          <DisclosureRow
            label="Manage Subscription"
            leading={<IconTile name="bolt.fill" tint="pink" />}
            onPress={() => void presentCustomerCenter()}
          />
        ) : (
          <>
            <DisclosureRow
              label={`Upgrade to ${PRO_NAME}`}
              leading={<IconTile name="bolt.fill" tint="purple" />}
              onPress={() => void presentPaywall("settings")}
            />
            <Separator inset={TILE_INSET} />
            <DisclosureRow
              label="Restore Purchases"
              leading={<IconTile name="arrow.clockwise" tint="grey" />}
              onPress={() => void onRestorePressed()}
            />
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
});
