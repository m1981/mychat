import { ChatInterface } from '@config/types/chat.types';
import { FolderCollection } from '@config/types/chat.types';

export interface ExportFormat {
  folders: FolderCollection;
  version: number;
  chats: ChatInterface[];
}

export type Export = ExportFormat;
export type LegacyExport = ChatInterface[];