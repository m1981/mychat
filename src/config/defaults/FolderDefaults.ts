import { FolderCollection } from '@type/chat';
import { generateUUID } from '@utils/uuid';

export const DEFAULT_FOLDERS: FolderCollection = {
  [generateUUID()]: {
    id: 'work-folder',
    name: 'Work Assistant',
    expanded: true,
    order: 0,
    color: '#2563eb',
  },
  [generateUUID()]: {
    id: 'learning-folder',
    name: 'Learning & Study',
    expanded: true,
    order: 1,
    color: '#16a34a',
  },
};