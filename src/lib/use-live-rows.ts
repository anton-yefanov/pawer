import { is } from 'drizzle-orm';
import { SQLiteTable, getTableConfig } from 'drizzle-orm/sqlite-core';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

type SyncQuery = {
  all: () => unknown[];
  _: { result: unknown };
};

type Rows<Q extends SyncQuery> = Q['_']['result'];

/**
 * `useLiveQuery` reads in an effect, so the first frame of a screen always
 * paints empty and the rows arrive a commit later. That is invisible on iOS but
 * plainly visible on Android, where a `formSheet` mounts before it animates in
 * and a chain of dependent queries (rows -> draft -> names) stretches it into
 * seconds of empty sheet.
 *
 * expo-sqlite's driver is synchronous, so the same rows can be had during
 * render; the change listener only has to keep them fresh afterwards. Like
 * `useLiveQuery`, it re-reads on writes to the query's primary table only.
 *
 * `key` identifies the query's inputs — re-reading synchronously when it
 * changes is what keeps a route param switch from painting stale rows.
 */
export function useLiveRows<Q extends SyncQuery>(build: () => Q, key: string = ''): Rows<Q> {
  const read = () => build().all() as Rows<Q>;
  const [state, setState] = useState(() => ({ key, rows: read() }));
  const rows = state.key === key ? state.rows : read();
  if (state.key !== key) setState({ key, rows });

  useEffect(() => {
    const query = build();
    // `config` is not on the public builder type; `useLiveQuery` reaches for it
    // the same way to learn which table to listen to.
    const { table } = (query as unknown as { config: { table: unknown } }).config;
    if (!is(table, SQLiteTable)) return;

    const { name } = getTableConfig(table);
    const listener = addDatabaseChangeListener((event) => {
      if (event.tableName === name) setState({ key, rows: query.all() as Rows<Q> });
    });
    return () => listener.remove();
    // `build` is re-created every render; `key` is what says its result changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return rows;
}
