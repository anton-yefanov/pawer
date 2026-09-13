import { router } from 'expo-router';

import { type IconName } from '@/components/icon';
import {
  createFolder,
  deleteFolder,
  removeFolderFromFolder,
  removeTemplateFromFolder,
  renameFolder,
} from '@/lib/folder-actions';
import { allowNewTemplate } from '@/lib/pro-gates';
import { prompt } from '@/lib/text-prompt';
import { deleteTemplate, duplicateTemplate } from '@/lib/template-actions';

import { attempt, guard } from '@/lib/observability';

const FAILED = {
  title: 'Couldn’t save',
  message: 'That change wasn’t saved. Please try again.',
};

export type CardAction = {
  label: string;
  icon: IconName;
  destructive?: boolean;
  /** Draws a divider above this row. */
  separated?: boolean;
  onPress: () => void;
};

export type ConfirmRequest = {
  title: string;
  body: string;
  onConfirm: () => void;
};

/**
 * Raising the confirm is the caller's job, and there is deliberately no default.
 * `Alert.alert` used to be one, and it was wrong on both platforms: on iOS it
 * presents from the view controller behind a formSheet and never reaches the
 * screen (see workout/confirm-alert.tsx), and on Android it is the Material
 * dialog rather than the app's own. Every caller holds the request in state and
 * hands it to `ConfirmAlert`.
 */
export type ConfirmDestructive = (options: ConfirmRequest) => void;

export type TemplateMenuTarget = {
  id: string;
  name: string;
  isBuiltIn: boolean;
  folderId: string | null;
};

/**
 * Every copy lands in My Templates, so a Library save is a new template and
 * counts against the free tier exactly like a blank one.
 */
export async function saveTemplateCopy(templateId: string, isPro: boolean): Promise<boolean> {
  if (!(await guard('pro-gates', allowNewTemplate(isPro)))) return false;
  return attempt('templates', duplicateTemplate(templateId), FAILED);
}

export function templateActions(
  template: TemplateMenuTarget,
  { confirm, isPro }: { confirm: ConfirmDestructive; isPro: boolean },
): CardAction[] {
  const save: CardAction = {
    label: 'Save',
    icon: 'plus.square.on.square',
    onPress: () => void saveTemplateCopy(template.id, isPro),
  };

  if (template.isBuiltIn) return [save];

  const actions: CardAction[] = [
    {
      label: 'Edit',
      icon: 'pencil',
      onPress: () =>
        router.push({
          pathname: '/template/edit',
          params: { id: template.id },
        }),
    },
    {
      label: 'Customize',
      icon: 'paintpalette',
      onPress: () =>
        router.push({
          pathname: '/customize',
          params: { id: template.id, kind: 'template' },
        }),
    },
    save,
  ];

  if (template.folderId) {
    actions.push({
      label: 'Remove from Folder',
      icon: 'folder.badge.minus',
      onPress: () => void attempt('templates', removeTemplateFromFolder(template.id), FAILED),
    });
  }

  actions.push({
    label: 'Delete',
    icon: 'trash',
    destructive: true,
    separated: true,
    onPress: () =>
      confirm({
        title: `Delete “${template.name}”?`,
        body: 'Workouts you logged from it are kept.',
        onConfirm: () => void attempt('templates', deleteTemplate(template.id), FAILED),
      }),
  });

  return actions;
}

export function folderActions(
  folder: { id: string; name: string; parentId: string | null; isBuiltIn: boolean },
  { confirm, canAddFolder = false }: { confirm: ConfirmDestructive; canAddFolder?: boolean },
): CardAction[] {
  // Nothing on a Library folder is the user's to change; the way out of one is
  // duplicating a template inside it.
  if (folder.isBuiltIn) return [];

  const actions: CardAction[] = [];

  if (canAddFolder) {
    actions.push({
      label: 'New Folder',
      icon: 'folder.badge.plus',
      onPress: () => promptNewFolder(folder.id),
    });
  }

  actions.push(
    {
      label: 'Rename',
      icon: 'pencil',
      onPress: () => promptRenameFolder(folder),
    },
    {
      label: 'Customize',
      icon: 'paintpalette',
      onPress: () =>
        router.push({
          pathname: '/customize',
          params: { id: folder.id, kind: 'folder' },
        }),
    },
  );

  if (folder.parentId) {
    actions.push({
      label: 'Remove from Folder',
      icon: 'folder.badge.minus',
      onPress: () => void attempt('folders', removeFolderFromFolder(folder.id), FAILED),
    });
  }

  actions.push({
    label: 'Delete',
    icon: 'trash',
    destructive: true,
    separated: true,
    onPress: () =>
      confirm({
        title: `Delete “${folder.name}”?`,
        body: 'Everything inside is kept and moves up a level.',
        onConfirm: () => void attempt('folders', deleteFolder(folder.id), FAILED),
      }),
  });

  return actions;
}

export function promptRenameFolder(folder: { id: string; name: string }): void {
  void attempt(
    'folders',
    prompt({
      title: 'Rename Folder',
      confirmLabel: 'Rename',
      initialValue: folder.name,
    }).then((value) => {
      const name = value.trim();
      if (name) return attempt('folders', renameFolder(folder.id, name), FAILED);
    }),
  );
}

export function promptNewFolder(parentId: string | null = null): void {
  void attempt(
    'folders',
    prompt({ title: 'New Folder', confirmLabel: 'Create' }).then((value) => {
      const name = value.trim();
      if (name) return attempt('folders', createFolder(name, parentId), FAILED);
    }),
  );
}
