import { ChatInterface, FolderCollection } from './chat';

export interface ExportBase {
  version: number;
}

export interface ExportV1 extends ExportBase {
  version: 1;
  chats: ChatInterface[];
  folders: FolderCollection;
}

export type Export = ExportV1;

// Legacy export type for backwards compatibility
export type LegacyExport = ChatInterface[];