import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { useMemo } from 'react';

import type { AchievementTier } from '@/constants/achievement-tiers';
import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { getSetting, setSetting } from '@/db/seed';
import type { LadderMetric } from '@/lib/achievement-scale';

export const ACHIEVEMENT_NEWS_KEY = 'achievements_new';

/**
 * The only thing this feature stores. An achievement is still a fact about the
 * logged sets — what is persisted here is whether the user has *looked* at it,
 * which nothing in the history can answer.
 *
 * `dot` is Home's unread mark and clears the moment the sheet is opened; `keys`
 * are the badges still wearing a NEW chip and clear one at a time, as each is
 * tapped. They are deliberately separate: opening the sheet is not reading
 * every badge in it.
 *
 * `announced` is every badge that has ever raised one of those, and is what
 * keeps a badge from being announced twice — a finished workout's recap can be
 * reached again by reopening that session from history, and a badge the user
 * has already dismissed must not come back as new.
 */
export type AchievementNews = {
  dot: boolean;
  keys: string[];
  announced: string[];
};

const NONE: AchievementNews = { dot: false, keys: [], announced: [] };

export function badgeKey(
  exerciseId: string,
  metric: LadderMetric,
  tier: AchievementTier['id']
): string {
  return `${exerciseId}:${metric}:${tier}`;
}

export function newsQuery() {
  return db.select().from(settings).where(eq(settings.key, ACHIEVEMENT_NEWS_KEY));
}

export function parseNews(value: string | null | undefined): AchievementNews {
  if (!value) return NONE;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return NONE;
    const { dot, keys, announced } = parsed as Partial<AchievementNews>;
    return {
      dot: dot === true,
      keys: strings(keys),
      announced: strings(announced),
    };
  } catch {
    return NONE;
  }
}

/** Live because `settings` is an ordinary table — Home and the sheet both follow a write. */
export function useAchievementNews(): AchievementNews {
  const { data } = useLiveQuery(newsQuery(), []);
  const value = data?.[0]?.value;
  return useMemo(() => parseNews(value), [value]);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

async function read(): Promise<AchievementNews> {
  return parseNews(await getSetting(db, ACHIEVEMENT_NEWS_KEY));
}

async function write(news: AchievementNews): Promise<void> {
  await setSetting(db, ACHIEVEMENT_NEWS_KEY, JSON.stringify(news));
}

export async function markEarned(keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return;
  const news = await read();
  const announced = new Set(news.announced);
  const fresh = keys.filter((key) => !announced.has(key));
  if (fresh.length === 0) return;

  await write({
    dot: true,
    keys: [...new Set([...news.keys, ...fresh])],
    announced: [...news.announced, ...fresh],
  });
}

export async function markDotSeen(): Promise<void> {
  const news = await read();
  if (!news.dot) return;
  await write({ ...news, dot: false });
}

export async function acknowledgeBadge(key: string): Promise<void> {
  const news = await read();
  if (!news.keys.includes(key)) return;
  await write({
    ...news,
    keys: news.keys.filter((current) => current !== key),
  });
}
