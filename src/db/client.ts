import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'pawer.db';

/**
 * `enableChangeListener` is what makes drizzle's `useLiveQuery` re-render on
 * writes. Without it every screen has to refetch by hand.
 */
export const sqliteDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

export const db = drizzle(sqliteDb, { schema });

export type Database = typeof db;
