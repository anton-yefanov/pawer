import { and, desc, eq, isNull } from 'drizzle-orm';

import { type CardColor } from '@/constants/card-colors';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { folders, templates } from '@/db/schema';
import { type CardArtwork, serializeArtwork } from '@/lib/card-artwork';

const touch = () => ({ updatedAt: Date.now() });

export async function createFolder(name: string): Promise<string> {
  const last = await db
    .select({ position: folders.position })
    .from(folders)
    .where(isNull(folders.deletedAt))
    .orderBy(desc(folders.position))
    .limit(1)
    .get();

  const id = newId();
  await db
    .insert(folders)
    .values({ id, name, color: 'blue', position: (last?.position ?? -1) + 1 });
  return id;
}

export async function renameFolder(folderId: string, name: string): Promise<void> {
  await db
    .update(folders)
    .set({ name, ...touch() })
    .where(eq(folders.id, folderId));
}

export async function setFolderAppearance(
  folderId: string,
  color: CardColor,
  artwork: CardArtwork | null,
): Promise<void> {
  await db
    .update(folders)
    .set({ color, artwork: serializeArtwork(artwork), ...touch() })
    .where(eq(folders.id, folderId));
}

/** The templates survive — they surface again at the top of My Templates. */
export async function deleteFolder(folderId: string): Promise<void> {
  const now = Date.now();
  await db
    .update(templates)
    .set({ folderId: null, updatedAt: now })
    .where(eq(templates.folderId, folderId));
  await db.update(folders).set({ deletedAt: now, updatedAt: now }).where(eq(folders.id, folderId));
}

/** `position` is rewritten wholesale — gaps from a soft delete never matter. */
export async function reorderFolders(orderedIds: readonly string[]): Promise<void> {
  const now = Date.now();
  for (const [position, id] of orderedIds.entries()) {
    await db.update(folders).set({ position, updatedAt: now }).where(eq(folders.id, id));
  }
}

export async function moveTemplateToFolder(
  templateId: string,
  folderId: string | null,
): Promise<void> {
  await db
    .update(templates)
    .set({ folderId, ...touch() })
    .where(and(eq(templates.id, templateId), eq(templates.isBuiltIn, false)));
}
