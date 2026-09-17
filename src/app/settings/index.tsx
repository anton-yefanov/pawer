import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  Card,
  DisclosureRow,
  ROW_ICON_INSET,
  RowIcon,
  Separator,
} from "@/components/grouped-list";
import { Emoji } from "@/components/emoji";
import { InfoButton } from "@/components/settings/info-button";
import { MenuRow } from "@/components/settings/menu-row";
import { ToggleRow } from "@/components/settings/toggle-row";
import { TabTitle, TAB_TITLE_INSET } from "@/components/tab-title";
import { ThemedText } from "@/components/themed-text";
import { TAB_CONTENT_INSET } from "@/constants/navigation";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { openReview } from "@/lib/app-store-review";
import { useAutofillWeightPreference } from "@/lib/autofill-weight";
import { BODY_SEXES, useBodySexPreference } from "@/lib/body-sex";
import {
  openLegalDocument,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from "@/lib/legal";
import {
  FINISH_REMINDER_OPTIONS,
  useFinishReminder,
} from "@/lib/finish-reminder";
import { prepareExport, shareExport } from "@/lib/export-csv";
import { notice } from "@/lib/notice";
import { presentCustomerCenter, presentPaywall } from "@/lib/paywall";
import {
  playRestSoundPreview,
  REST_SOUNDS,
  useRestSound,
} from "@/lib/rest-sound";
import { PRO_NAME, usePurchases } from "@/lib/purchases";
import { TINT_OPTIONS } from "@/constants/tints";
import { THEME_PREFERENCES, useThemePreference } from "@/lib/theme-preference";
import { useWarmupStatsPreference } from "@/lib/warmup-stats";
import { WEIGHT_UNITS, useWeightUnitPreference } from "@/lib/weight-unit";
import { ensureNotificationPermission } from "@/lib/notifications";
import { attempt, guard } from "@/lib/observability";

const SAVE_FAILED = {
  title: "Couldn’t save setting",
  message: "Please try again.",
};

const EXPORT_FAILED = {
  title: "Couldn’t export your data",
  message: "Please try again.",
};

const RESTORE_MESSAGES = {
  restored: `Your purchase is back. ${PRO_NAME} is unlocked.`,
  nothing: "No previous purchase was found on this account.",
} as const;

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference, setPreference, tint, setTint } = useThemePreference();
  const { unit, setUnit } = useWeightUnitPreference();
  const { sex, setSex } = useBodySexPreference();
  const [menuOpen, setMenuOpen] = useState(false);
  const { enabled: autofillWeight, setEnabled: setAutofillWeight } =
    useAutofillWeightPreference();
  const { enabled: includeWarmup, setEnabled: setIncludeWarmup } =
    useWarmupStatsPreference();
  const { option: finishReminder, setOption: setFinishReminder } =
    useFinishReminder();
  const { sound: restSound, setSound: setRestSound } = useRestSound();
  const { isPro, restore } = usePurchases();
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);
  const onExportPressed = async () => {
    if (exporting) return;
    setExporting(true);
    // The spinner covers building the file only: `shareAsync` resolves when the
    // sheet closes, and a row still spinning behind it would read as stuck.
    const uri = await guard("export", prepareExport(), EXPORT_FAILED);
    setExporting(false);
    if (uri) await shareExport(uri);
  };
  const onRestorePressed = async () => {
    if (restoring) return;
    setRestoring(true);
    const result = await restore().finally(() => setRestoring(false));
    notice({
      title: PRO_NAME,
      message:
        result.status === "error"
          ? result.message
          : RESTORE_MESSAGES[result.status],
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, { paddingTop: TAB_TITLE_INSET }]}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.title}>
          <TabTitle title="Settings" />
        </View>
        <Section title="App">
          <MenuRow
            label="Appearance"
            leading={<RowIcon name="circle.lefthalf.filled" />}
            options={THEME_PREFERENCES}
            selected={preference}
            onSelect={(id) =>
              void attempt("settings", setPreference(id), SAVE_FAILED)
            }
            onOpenChange={setMenuOpen}
          />
          <Separator inset={ROW_ICON_INSET} />
          <MenuRow
            label="Tint Color"
            leading={<RowIcon name="paintpalette" />}
            options={TINT_OPTIONS}
            selected={tint}
            trailing={
              <View style={[styles.swatch, { backgroundColor: theme.accent }]} />
            }
            onSelect={(id) => void attempt("settings", setTint(id), SAVE_FAILED)}
            onOpenChange={setMenuOpen}
          />
        </Section>

        <Section title="Workouts">
          <MenuRow
            label="Weight Unit"
            leading={<RowIcon name="dumbbell" />}
            options={WEIGHT_UNITS}
            selected={unit}
            onSelect={(id) =>
              void attempt("settings", setUnit(id), SAVE_FAILED)
            }
            onOpenChange={setMenuOpen}
          />
          <Separator inset={ROW_ICON_INSET} />
          <MenuRow
            label="Body Diagram"
            leading={<RowIcon name="figure.strengthtraining.traditional" />}
            options={BODY_SEXES}
            selected={sex}
            onSelect={(id) =>
              void attempt("settings", setSex(id), SAVE_FAILED)
            }
            onOpenChange={setMenuOpen}
          />
          <Separator inset={ROW_ICON_INSET} />
          <ToggleRow
            label="Autofill Weight"
            leading={<RowIcon name="wand.and.stars" />}
            accessory={
              <InfoButton topic="autofill-weight" label="Autofill Weight" />
            }
            value={autofillWeight}
            onChange={setAutofillWeight}
          />
          <Separator inset={ROW_ICON_INSET} />
          <ToggleRow
            label="Include Warmup in Stats"
            leading={<RowIcon name="flame" />}
            value={includeWarmup}
            onChange={setIncludeWarmup}
          />
          <Separator inset={ROW_ICON_INSET} />
          <MenuRow
            label="Finish Reminder"
            title="Remind me after being inactive for"
            leading={<RowIcon name="timer" />}
            options={FINISH_REMINDER_OPTIONS}
            selected={finishReminder}
            onSelect={(id) => {
              void attempt("settings", setFinishReminder(id), SAVE_FAILED);
              // Asked here rather than at launch: this is the moment the user
              // has said they want the notification.
              if (id !== "never")
                void attempt("notifications", ensureNotificationPermission());
            }}
            onOpenChange={setMenuOpen}
          />
          <Separator inset={ROW_ICON_INSET} />
          <MenuRow
            label="Rest Sound"
            title="Play when rest is over"
            leading={<RowIcon name="speaker.wave.2" />}
            accessory={<InfoButton topic="rest-sound" label="Rest Sound" />}
            options={REST_SOUNDS}
            selected={restSound}
            onSelect={(id) => {
              void attempt("settings", setRestSound(id), SAVE_FAILED);
              playRestSoundPreview(id);
            }}
            onOpenChange={setMenuOpen}
          />
        </Section>

        <Section title="Workout Data">
          <DisclosureRow
            label="Import Data"
            leading={<RowIcon name="square.and.arrow.down" />}
            chevron={false}
            onPress={() => router.push("/settings/import")}
          />
          <Separator inset={ROW_ICON_INSET} />
          <DisclosureRow
            label="Export Data"
            leading={<RowIcon name="square.and.arrow.up" loading={exporting} />}
            chevron={false}
            onPress={() => void onExportPressed()}
          />
        </Section>

        <Section title={PRO_NAME}>
          {isPro ? (
            <DisclosureRow
              label="Manage Subscription"
              leading={<RowIcon name="bolt" />}
              onPress={() => void presentCustomerCenter()}
            />
          ) : (
            <>
              <DisclosureRow
                label={`Upgrade to ${PRO_NAME}`}
                leading={<RowIcon name="bolt" />}
                onPress={() => void presentPaywall("settings")}
              />
              <Separator inset={ROW_ICON_INSET} />
              <DisclosureRow
                label="Restore Purchases"
                leading={<RowIcon name="arrow.clockwise" loading={restoring} />}
                onPress={() => void onRestorePressed()}
              />
            </>
          )}
        </Section>

        <Section title="About">
          <DisclosureRow
            label="Support"
            leading={<RowIcon name="questionmark.circle" />}
            onPress={() => router.push("/settings/support")}
          />
          <Separator inset={ROW_ICON_INSET} />
          <DisclosureRow
            label="Rate Pawer on App Store"
            leading={<RowIcon name="star" />}
            onPress={() => void openReview()}
          />
        </Section>

        <View style={styles.footer}>
          <View style={styles.madeWith}>
            <ThemedText type="footnote" themeColor="textTertiary">
              Made with
            </ThemedText>
            <Emoji value="❤️" size={13} />
            <ThemedText type="footnote" themeColor="textTertiary">
              and
            </ThemedText>
            <Emoji value="☕" size={13} />
          </View>
          <View style={styles.links}>
            <FooterLink label="Terms" url={TERMS_OF_SERVICE_URL} />
            <FooterLink label="Privacy" url={PRIVACY_POLICY_URL} />
          </View>
        </View>
      </ScrollView>

      {/*
        Swallows the tap that dismisses an open menu: UIKit lets it through, and
        here it would otherwise flip a switch or open a row underneath.
      */}
      {menuOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setMenuOpen(false)}
          accessibilityLabel="Dismiss menu"
        />
      )}
    </View>
  );
}

function FooterLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={Spacing.two}
      onPress={() =>
        void attempt("settings", openLegalDocument(url), {
          title: `Couldn’t open ${label}`,
          message: "Please try again.",
        })
      }
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedText type="footnote" themeColor="textTertiary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <ThemedText
        type="headline"
        themeColor="textTertiary"
        style={styles.sectionTitle}
      >
        {title}
      </ThemedText>
      <Card>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  content: {
    paddingBottom: TAB_CONTENT_INSET + Spacing.four,
    gap: Spacing.four,
  },
  title: {
    paddingHorizontal: Spacing.three,
  },
  footer: {
    alignItems: "center",
    gap: Spacing.two,
  },
  madeWith: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  links: {
    flexDirection: "row",
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.5,
  },
  sectionTitle: {
    paddingHorizontal: Spacing.three * 2,
    paddingBottom: Spacing.two,
  },
});
