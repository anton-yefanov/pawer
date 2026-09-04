import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { setOptedOut } from '@/lib/telemetry';

const TELEMETRY_CONSENT_KEY = 'telemetry_consent';

/** `null` means the user has not yet made a choice. */
export async function readTelemetryConsent(): Promise<boolean | null> {
  const value = await getSetting(db, TELEMETRY_CONSENT_KEY);
  if (value === null) return null;
  return value === 'true';
}

/**
 * Both values are written deliberately: the database row is the app's source
 * of truth, and the SDK flag suppresses events before the next lifecycle event.
 */
export async function writeTelemetryConsent(consented: boolean): Promise<void> {
  setOptedOut(!consented);
  await setSetting(db, TELEMETRY_CONSENT_KEY, String(consented));
}
