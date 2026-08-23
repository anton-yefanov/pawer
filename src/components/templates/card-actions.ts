import { router } from 'expo-router';

import { type IconName } from '@/components/icon';
import {
  createFolder,
  deleteFolder,
  moveTemplateToFolder,
  renameFolder,
} from '@/lib/folder-actions';
import { prompt } from '@/lib/text-prompt';
import { deleteTemplate, duplicateTemplate } from '@/lib/template-actions';

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

export function templateActions(
  template: TemplateMenuTarget,
  confirm: ConfirmDestructive,
): CardAction[] {
  const duplicate: CardAction = {
    label: 'Duplicate',
    icon: 'plus.square.on.square',
    onPress: () => void duplicateTemplate(template.id),
  };

  if (template.isBuiltIn) return [duplicate];

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
    duplicate,
  ];

  if (template.folderId) {
    actions.push({
      label: 'Remove from Folder',
      icon: 'folder.badge.minus',
      onPress: () => void moveTemplateToFolder(template.id, null),
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
        onConfirm: () => void deleteTemplate(template.id),
      }),
  });

  return actions;
}

export function folderActions(
  folder: { id: string; name: string },
  { confirm }: { confirm: ConfirmDestructive },
): CardAction[] {
  return [
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
    {
      label: 'Delete',
      icon: 'trash',
      destructive: true,
      separated: true,
      onPress: () =>
        confirm({
          title: `Delete “${folder.name}”?`,
          body: 'The templates inside are kept.',
          onConfirm: () => void deleteFolder(folder.id),
        }),
    },
  ];
}

export function promptRenameFolder(folder: { id: string; name: string }): void {
  void prompt({ title: 'Rename Folder', confirmLabel: 'Rename', initialValue: folder.name }).then(
    (value) => {
      const name = value.trim();
      if (name) void renameFolder(folder.id, name);
    },
  );
}

export function promptNewFolder(): void {
  void prompt({ title: 'New Folder', confirmLabel: 'Create' }).then((value) => {
    const name = value.trim();
    if (name) void createFolder(name);
  });
}
