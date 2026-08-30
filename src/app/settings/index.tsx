import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { Card, DisclosureRow, Separator } from "@/components/grouped-list";
import { ToggleRow } from "@/components/settings/toggle-row";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { openReview } from "@/lib/app-store-review";
import { useAutofillWeightPreference } from "@/lib/autofill-weight";
import {
  FINISH_REMINDER_OPTIONS,
  useFinishReminder,
} from "@/lib/finish-reminder";
import { notice } from "@/lib/notice";
import { presentCustomerCenter, presentPaywall } from "@/lib/paywall";
import { PRO_NAME, usePurchases } from "@/lib/purchases";
import {
  readTelemetryOptOut,
  writeTelemetryOptOut,
} from "@/lib/telemetry-opt-out";
import { THEME_PREFERENCES, useThemePreference } from "@/lib/theme-preference";
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
  const { option: finishReminder } = useFinishReminder();
  const { isPro, restore } = usePurchases();
  const [shareUsage, setShareUsage] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void attempt(
      "settings",
      readTelemetryOptOut().then((optedOut) => {
        if (!cancelled) setShareUsage(!optedOut);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

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
        {isPro ? (
          <DisclosureRow
            label="Manage Subscription"
            onPress={() => void presentCustomerCenter()}
          />
        ) : (
          <>
            <DisclosureRow
              label={`Upgrade to ${PRO_NAME}`}
              onPress={() => void presentPaywall("settings")}
            />
            <Separator />
            <DisclosureRow
              label="Restore Purchases"
              onPress={() => void onRestorePressed()}
            />
          </>
        )}
      </Card>

      <Card>
        <DisclosureRow
          label="Dark Theme"
          value={
            THEME_PREFERENCES.find((option) => option.id === preference)?.short
          }
          chevron={false}
          onPress={() => router.push("/settings/theme")}
        />
        <Separator />
        <DisclosureRow
          label="Weight Unit"
          value={unit}
          chevron={false}
          onPress={() => router.push("/settings/weight-unit")}
        />
        <Separator />
        <ToggleRow
          label="Autofill Weight"
          value={autofillWeight}
          onChange={setAutofillWeight}
        />
        <Separator />
        <DisclosureRow
          label="Finish Reminder"
          value={
            FINISH_REMINDER_OPTIONS.find(
              (option) => option.id === finishReminder,
            )?.short
          }
          chevron={false}
          onPress={() => router.push("/settings/finish-reminder")}
        />
        <Separator />
        <ToggleRow
          label="Share Anonymous Usage Data"
          value={shareUsage}
          onChange={(next) => {
            setShareUsage(next);
            void attempt("settings", writeTelemetryOptOut(!next), {
              title: "Couldn’t save setting",
              message: "Please try again.",
            }).then((written) => {
              if (!written) setShareUsage(!next);
            });
          }}
        />
        <Separator />
        <DisclosureRow
          label="Support"
          onPress={() => router.push("/settings/support")}
        />
        <Separator />
        <DisclosureRow
          label="Rate Pawer on App Store"
          onPress={() => void openReview()}
        />
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
