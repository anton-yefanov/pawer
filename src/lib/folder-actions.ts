import { and, desc, eq, isNull } from 'drizzle-orm';

import { type CardColor } from '@/constants/card-colors';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import { folders, templates } from '@/db/schema';
import { type CardArtwork, serializeArtwork } from '@/lib/card-artwork';

const touch = () => ({ updatedAt: Date.now() });

export async function createFolder(name: string, parentId: string | null = null): Promise<string> {
  const last = await db
    .select({ position: folders.position })
    .from(folders)
    .where(and(parentIs(parentId), isNull(folders.deletedAt)))
    .orderBy(desc(folders.position))
    .limit(1)
    .get();

  const id = newId();
  await db.insert(folders).values({
    id,
    name,
    parentId,
    color: 'blue',
    position: (last?.position ?? -1) + 1,
  });
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

/** Everything inside survives, lifted one level into the folder's own parent. */
export async function deleteFolder(folderId: string): Promise<void> {
  const now = Date.now();
  const parentId = await parentOf(folderId);
  await db
    .update(templates)
    .set({ folderId: parentId, updatedAt: now })
    .where(eq(templates.folderId, folderId));
  await db.update(folders).set({ parentId, updatedAt: now }).where(eq(folders.parentId, folderId));
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

export async function moveFolderToFolder(folderId: string, parentId: string | null): Promise<void> {
  // A folder filed under one of its own descendants would drop out of the tree.
  for (let cursor = parentId; cursor !== null; cursor = await parentOf(cursor)) {
    if (cursor === folderId) return;
  }
  await db
    .update(folders)
    .set({ parentId, ...touch() })
    .where(eq(folders.id, folderId));
}

/** Lifts a template one level, into its folder's parent. */
export async function removeTemplateFromFolder(templateId: string): Promise<void> {
  const row = await db
    .select({ folderId: templates.folderId })
    .from(templates)
    .where(eq(templates.id, templateId))
    .get();
  if (!row?.folderId) return;
  await moveTemplateToFolder(templateId, await parentOf(row.folderId));
}

/** Lifts a folder one level, into its parent's parent. */
export async function removeFolderFromFolder(folderId: string): Promise<void> {
  const parentId = await parentOf(folderId);
  if (parentId === null) return;
  await moveFolderToFolder(folderId, await parentOf(parentId));
}

async function parentOf(folderId: string): Promise<string | null> {
  const row = await db
    .select({ parentId: folders.parentId })
    .from(folders)
    .where(eq(folders.id, folderId))
    .get();
  return row?.parentId ?? null;
}

function parentIs(parentId: string | null) {
  return parentId === null ? isNull(folders.parentId) : eq(folders.parentId, parentId);
}
