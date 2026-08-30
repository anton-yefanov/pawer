import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'pawer.db';

/**
 * A corrupt or locked file throws here, at import time — above every provider
 * and every error boundary, so React never gets to render anything. Falling
 * back to an in-memory handle keeps the module importable; `DatabaseProvider`
 * reads `databaseOpenError` and shows the failure instead of the app.
 */
function open(): { sqlite: SQLiteDatabase; error: Error | null } {
  try {
    return {
      sqlite: openDatabaseSync(DATABASE_NAME, { enableChangeListener: true }),
      error: null,
    };
  } catch (e) {
    return {
      sqlite: openDatabaseSync(':memory:', { enableChangeListener: true }),
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

const opened = open();

/**
 * `enableChangeListener` is what makes drizzle's `useLiveQuery` re-render on
 * writes. Without it every screen has to refetch by hand.
 */
export const sqliteDb = opened.sqlite;

export const databaseOpenError = opened.error;

export const db = drizzle(sqliteDb, { schema });

export type Database = typeof db;

/**
 * What a query helper takes when it has to run either standalone or inside a
 * `db.transaction` callback. The transaction handle is the database minus its
 * `$client` escape hatch, which nothing in this app reaches for.
 */
export type Executor = Omit<Database, '$client'>;
