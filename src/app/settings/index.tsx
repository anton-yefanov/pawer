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
import { t } from "@/i18n";
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
import { useAppReset } from "@/lib/app-reset";
import {
  changeLanguage,
  LANGUAGE_CHOICE,
  LANGUAGE_OPTIONS,
  LANGUAGE_SUPPORTED,
} from "@/lib/app-language";
import { countFinishedWorkouts, deleteAllUserData } from "@/lib/delete-account";
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
  title: t("settings:saveFailed"),
  message: t("common:error.tryAgain"),
};

const EXPORT_FAILED = {
  title: t("settings:exportFailed"),
  message: t("common:error.tryAgain"),
};

const DELETE_FAILED = {
  title: t("settings:deleteFailed"),
  message: t("common:error.tryAgain"),
};

const RESTORE_MESSAGES = {
  restored: t("settings:restore.restored", { pro: PRO_NAME }),
  nothing: t("settings:restore.nothing"),
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
  const resetApp = useAppReset();
  const [deleting, setDeleting] = useState(false);
  const deleteAccount = async () => {
    setDeleting(true);
    const deleted = await attempt(
      "delete-account",
      deleteAllUserData(),
      DELETE_FAILED,
    );
    setDeleting(false);
    if (deleted) resetApp();
  };
  const confirmDelete = async () => {
    if (deleting) return;
    const workouts = await guard(
      "delete-account",
      countFinishedWorkouts(),
      DELETE_FAILED,
    );
    if (workouts === undefined) return;
    notice({
      title: t("settings:delete.title"),
      message:
        workouts > 0
          ? t("settings:delete.messageWithWorkouts", { count: workouts, pro: PRO_NAME })
          : t("settings:delete.message", { pro: PRO_NAME }),
      actions: [
        ...(workouts > 0
          ? [
              {
                label: t("settings:delete.exportFirst"),
                onPress: () =>
                  void onExportPressed().then(() => confirmDelete()),
              },
            ]
          : []),
        {
          label: t("settings:delete.confirm"),
          role: "destructive" as const,
          onPress: () => void deleteAccount(),
        },
        { label: t("common:action.cancel"), role: "cancel" as const, onPress: () => {} },
      ],
    });
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
          <TabTitle title={t("settings:title")} />
        </View>
        <Section title={t("settings:section.app")}>
          <MenuRow
            label={t("settings:row.appearance")}
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
            label={t("settings:row.tint")}
            leading={<RowIcon name="paintpalette" />}
            options={TINT_OPTIONS}
            selected={tint}
            trailing={
              <View style={[styles.swatch, { backgroundColor: theme.accent }]} />
            }
            onSelect={(id) => void attempt("settings", setTint(id), SAVE_FAILED)}
            onOpenChange={setMenuOpen}
          />
          {LANGUAGE_SUPPORTED ? (
            <>
              <Separator inset={ROW_ICON_INSET} />
              <MenuRow
                label={t("settings:row.language")}
                leading={<RowIcon name="globe" />}
                options={LANGUAGE_OPTIONS}
                selected={LANGUAGE_CHOICE}
                onSelect={changeLanguage}
                onOpenChange={setMenuOpen}
              />
            </>
          ) : null}
        </Section>

        <Section title={t("settings:section.workouts")}>
          <MenuRow
            label={t("settings:row.weightUnit")}
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
            label={t("settings:row.bodyDiagram")}
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
            label={t("settings:row.autofillWeight")}
            leading={<RowIcon name="wand.and.stars" />}
            accessory={
              <InfoButton topic="autofill-weight" label={t("settings:row.autofillWeight")} />
            }
            value={autofillWeight}
            onChange={setAutofillWeight}
          />
          <Separator inset={ROW_ICON_INSET} />
          <ToggleRow
            label={t("settings:row.includeWarmup")}
            leading={<RowIcon name="flame" />}
            value={includeWarmup}
            onChange={setIncludeWarmup}
          />
          <Separator inset={ROW_ICON_INSET} />
          <MenuRow
            label={t("settings:row.finishReminder")}
            title={t("settings:row.finishReminderTitle")}
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
            label={t("settings:row.restSound")}
            title={t("settings:row.restSoundTitle")}
            leading={<RowIcon name="speaker.wave.2" />}
            accessory={<InfoButton topic="rest-sound" label={t("settings:row.restSound")} />}
            options={REST_SOUNDS}
            selected={restSound}
            onSelect={(id) => {
              void attempt("settings", setRestSound(id), SAVE_FAILED);
              playRestSoundPreview(id);
            }}
            onOpenChange={setMenuOpen}
          />
        </Section>

        <Section title={t("settings:section.data")}>
          <DisclosureRow
            label={t("settings:row.import")}
            leading={<RowIcon name="square.and.arrow.down" />}
            chevron={false}
            onPress={() => router.push("/settings/import")}
          />
          <Separator inset={ROW_ICON_INSET} />
          <DisclosureRow
            label={t("settings:row.export")}
            leading={<RowIcon name="square.and.arrow.up" loading={exporting} />}
            chevron={false}
            onPress={() => void onExportPressed()}
          />
        </Section>

        <Section title={PRO_NAME}>
          {isPro ? (
            <DisclosureRow
              label={t("settings:row.manageSubscription")}
              leading={<RowIcon name="bolt" />}
              onPress={() => void presentCustomerCenter()}
            />
          ) : (
            <>
              <DisclosureRow
                label={t("settings:row.upgrade", { pro: PRO_NAME })}
                leading={<RowIcon name="bolt" />}
                onPress={() => void presentPaywall("settings")}
              />
              <Separator inset={ROW_ICON_INSET} />
              <DisclosureRow
                label={t("settings:row.restore")}
                leading={<RowIcon name="arrow.clockwise" loading={restoring} />}
                onPress={() => void onRestorePressed()}
              />
            </>
          )}
        </Section>

        <Section title={t("settings:section.about")}>
          <DisclosureRow
            label={t("settings:row.support")}
            leading={<RowIcon name="questionmark.circle" />}
            onPress={() => router.push("/settings/support")}
          />
          <Separator inset={ROW_ICON_INSET} />
          <DisclosureRow
            label={t("settings:row.rate")}
            leading={<RowIcon name="star" />}
            onPress={() => void openReview()}
          />
        </Section>

        <Section title={t("settings:section.account")}>
          <DisclosureRow
            label={t("settings:row.deleteAccount")}
            leading={<RowIcon name="trash" loading={deleting} destructive />}
            chevron={false}
            destructive
            onPress={() => void confirmDelete()}
          />
        </Section>

        <View style={styles.footer}>
          <View style={styles.madeWith}>
            <ThemedText type="footnote" themeColor="textTertiary">
              {t("settings:footer.madeWith")}
            </ThemedText>
            <Emoji value="❤️" size={13} />
            <ThemedText type="footnote" themeColor="textTertiary">
              {t("settings:footer.and")}
            </ThemedText>
            <Emoji value="☕" size={13} />
          </View>
          <View style={styles.links}>
            <FooterLink label={t("settings:footer.terms")} url={TERMS_OF_SERVICE_URL} />
            <FooterLink label={t("settings:footer.privacy")} url={PRIVACY_POLICY_URL} />
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
          accessibilityLabel={t("settings:dismissMenu")}
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
          title: t("settings:openFailed", { label }),
          message: t("common:error.tryAgain"),
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
