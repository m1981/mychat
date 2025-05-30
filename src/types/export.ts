import { ChatInterface } from '@config/types/chat.types';
import { FolderCollection } from './chat';

export interface ExportBase {
  version: number;
}

export interface ExportV1 extends ExportBase {
  chats: ChatInterface[];
  folders: FolderCollection;
}

export type Export = ExportV1;
export type LegacyExport = ChatInterface[];