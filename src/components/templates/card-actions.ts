import { router } from 'expo-router';
import { Alert } from 'react-native';

import { type CardAction } from '@/components/templates/card-menu';
import {
  createFolder,
  deleteFolder,
  moveTemplateToFolder,
  renameFolder,
} from '@/lib/folder-actions';
import { deleteTemplate, duplicateTemplate } from '@/lib/template-actions';

export type ConfirmDestructive = (options: {
  title: string;
  body: string;
  onConfirm: () => void;
}) => void;

/**
 * Callers inside a formSheet must pass their own `confirm` — a UIAlertController
 * raised from behind a formSheet never reaches the screen (see dialog.tsx).
 */
const alertConfirm: ConfirmDestructive = ({ title, body, onConfirm }) =>
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);

export type TemplateMenuTarget = {
  id: string;
  name: string;
  isBuiltIn: boolean;
  folderId: string | null;
};

export function templateActions(
  template: TemplateMenuTarget,
  confirm: ConfirmDestructive = alertConfirm
): CardAction[] {
  const duplicate: CardAction = {
    label: 'Duplicate',
    systemImage: 'plus.square.on.square',
    onPress: () => void duplicateTemplate(template.id),
  };

  if (template.isBuiltIn) return [duplicate];

  const actions: CardAction[] = [
    {
      label: 'Edit',
      systemImage: 'pencil',
      onPress: () =>
        router.push({ pathname: '/workout/template/edit', params: { id: template.id } }),
    },
    duplicate,
  ];

  if (template.folderId) {
    actions.push({
      label: 'Remove from Folder',
      systemImage: 'folder.badge.minus',
      onPress: () => void moveTemplateToFolder(template.id, null),
    });
  }

  actions.push({
    label: 'Delete',
    systemImage: 'trash',
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

export function folderActions(folder: { id: string; name: string }): CardAction[] {
  return [
    {
      label: 'Rename',
      systemImage: 'pencil',
      onPress: () =>
        Alert.prompt(
          'Rename Folder',
          undefined,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Rename',
              onPress: (value?: string) => {
                const name = value?.trim();
                if (name) void renameFolder(folder.id, name);
              },
            },
          ],
          'plain-text',
          folder.name
        ),
    },
    {
      label: 'Delete',
      systemImage: 'trash',
      destructive: true,
      separated: true,
      onPress: () =>
        alertConfirm({
          title: `Delete “${folder.name}”?`,
          body: 'The templates inside are kept.',
          onConfirm: () => void deleteFolder(folder.id),
        }),
    },
  ];
}

export function promptNewFolder(): void {
  Alert.prompt(
    'New Folder',
    undefined,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Create',
        onPress: (value?: string) => {
          const name = value?.trim();
          if (name) void createFolder(name);
        },
      },
    ],
    'plain-text'
  );
}
