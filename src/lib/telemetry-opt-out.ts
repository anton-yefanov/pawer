import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { setOptedOut } from '@/lib/telemetry';

export const TELEMETRY_OPT_OUT_KEY = 'telemetry_opt_out';

export async function readTelemetryOptOut(): Promise<boolean> {
  return (await getSetting(db, TELEMETRY_OPT_OUT_KEY)) === 'true';
}

/**
 * Both, on purpose. The row is what the Settings toggle renders, since the
 * SDK's own flag is only readable once it has finished loading its store; the
 * SDK's flag is what actually suppresses events, and it is the one that is
 * honoured on the next launch before a single lifecycle event fires.
 */
export async function writeTelemetryOptOut(next: boolean): Promise<void> {
  setOptedOut(next);
  await setSetting(db, TELEMETRY_OPT_OUT_KEY, String(next));
}
