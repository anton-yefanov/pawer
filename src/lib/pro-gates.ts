import { and, count, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { templates } from '@/db/schema';
import { getSetting, setSetting } from '@/db/seed';
import { presentPaywall } from '@/lib/paywall';

/**
 * Where the free tier stops (IMPLEMENTATION_PLAN.md §4). Logging and a user's
 * own history are never gated — only what they can build on top of it.
 */
export const FREE_TEMPLATE_LIMIT = 3;

const FIRST_WORKOUT_PAYWALL_KEY = 'paywall_first_workout';

/** Resolves true once the user may create another template — buying counts. */
export async function allowNewTemplate(isPro: boolean): Promise<boolean> {
  if (isPro) return true;

  const row = await db
    .select({ total: count() })
    .from(templates)
    .where(and(eq(templates.isBuiltIn, false), isNull(templates.deletedAt)))
    .get();

  if ((row?.total ?? 0) < FREE_TEMPLATE_LIMIT) return true;
  return (await presentPaywall()) === 'purchased';
}

/**
 * The one unprompted paywall in the app, and it lands after the first workout
 * the user finishes rather than at launch: they have to feel the thing work
 * once. The flag is written before presenting, so a dismissal — or a crash
 * mid-present — never asks twice.
 */
export async function presentFirstWorkoutPaywall(isPro: boolean): Promise<void> {
  if (isPro) return;
  if (await getSetting(db, FIRST_WORKOUT_PAYWALL_KEY)) return;

  await setSetting(db, FIRST_WORKOUT_PAYWALL_KEY, String(Date.now()));
  await presentPaywall();
}
