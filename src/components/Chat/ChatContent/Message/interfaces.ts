import { Role } from '@type/chat';

export interface MessageContentProps {
  role: Role;
  content: string;
  messageIndex: number;
  isComposer: boolean;
  isEdit: boolean;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  focusLine?: number | null;
}

export interface ContentViewProps {
  content: string;
}

export interface EditViewProps {
  // Minimal props - uses context
  customKeyHandler?: (e: React.KeyboardEvent) => void;
}

export interface EditViewButtonsProps {
  // No props needed - uses context
  customSaveHandler?: () => void;
}

export interface CodeBlockProps {
  lang: string;
  codeChildren: React.ReactNode;
}

export interface MermaidDiagramProps {
  content: string;
}

export interface MessageEditorContextType {
  // State
  editContent: string;
  isModalOpen: boolean;
  isEditing: boolean;
  
  // Setters
  setEditContent: React.Dispatch<React.SetStateAction<string>>;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Refs
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  
  // Actions
  handleSave: () => void;
  handleSaveAndSubmit: () => Promise<void>;
  resetTextAreaHeight: () => void;
  
  // Metadata
  messageIndex: number;
  isComposer: boolean;
  focusLine?: number | null;
}

export interface MessageEditorProviderProps {
  children: React.ReactNode;
  initialContent: string;
  messageIndex: number;
  isComposer: boolean;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  focusLine?: number | null;
}

// Hook interfaces
export interface UseMessageEditorProps {
  initialContent: string;
  messageIndex: number;
  isComposer: boolean;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseMessageEditorReturn {
  editContent: string;
  setEditContent: React.Dispatch<React.SetStateAction<string>>;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleSave: () => void;
  handleSaveAndSubmit: () => Promise<void>;
  resetTextAreaHeight: () => void;
}

export interface UseKeyboardShortcutsReturn {
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}
