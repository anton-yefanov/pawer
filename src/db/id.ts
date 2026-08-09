import { randomUUID } from 'expo-crypto';

/**
 * Every primary key in this app is a UUID. Sync, whenever it arrives, needs ids
 * that two devices can mint independently without colliding.
 */
export function newId(): string {
  return randomUUID();
}
