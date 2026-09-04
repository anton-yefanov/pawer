import { and, count, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { exercises, templates } from '@/db/schema';
import { isPeriodLocked, type PeriodId } from '@/lib/analytics-period';
import { presentPaywall } from '@/lib/paywall';

/**
 * Where the free tier stops (IMPLEMENTATION_PLAN.md §4). Logging and a user's
 * own history are never gated — only what they can build on top of it.
 */
export const FREE_TEMPLATE_LIMIT = 3;
export const FREE_CUSTOM_EXERCISE_LIMIT = 3;

/** Resolves true once the user may create another template — buying counts. */
export async function allowNewTemplate(isPro: boolean): Promise<boolean> {
  if (isPro) return true;

  const row = await db
    .select({ total: count() })
    .from(templates)
    .where(and(eq(templates.isBuiltIn, false), isNull(templates.deletedAt)))
    .get();

  if ((row?.total ?? 0) < FREE_TEMPLATE_LIMIT) return true;
  return (await presentPaywall('template_limit')) === 'purchased';
}

/** Resolves true once the user may create another custom exercise — buying counts. */
export async function allowNewCustomExercise(isPro: boolean): Promise<boolean> {
  if (isPro) return true;

  const row = await db
    .select({ total: count() })
    .from(exercises)
    .where(and(eq(exercises.isCustom, true), isNull(exercises.deletedAt)))
    .get();

  if ((row?.total ?? 0) < FREE_CUSTOM_EXERCISE_LIMIT) return true;
  return (await presentPaywall('custom_exercise_limit')) === 'purchased';
}

/** Resolves true once the analytics range may be shown — buying counts. */
export async function allowPeriod(id: PeriodId, isPro: boolean): Promise<boolean> {
  if (!isPeriodLocked(id, isPro)) return true;
  return (await presentPaywall('analytics_period')) === 'purchased';
}
