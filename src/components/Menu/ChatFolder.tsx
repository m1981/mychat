import React, { useEffect, useRef, useState } from 'react';


import { folderColorOptions } from '@constants/color';
import CancelIcon from '@icon/CancelIcon';
import ColorPaletteIcon from '@icon/ColorPaletteIcon';
import CrossIcon from '@icon/CrossIcon';
import DeleteIcon from '@icon/DeleteIcon';
import DownChevronArrow from '@icon/DownChevronArrow';
import EditIcon from '@icon/EditIcon';
import FolderIcon from '@icon/FolderIcon';
import RefreshIcon from '@icon/RefreshIcon';
import TickIcon from '@icon/TickIcon';
import useStore from '@store/store';
import {
  ChatHistoryInterface,
  ChatInterface,
  FolderCollection,
} from '@type/chat';
import { Draggable } from 'react-beautiful-dnd';

import ChatHistory from './ChatHistory';
import NewChat from './NewChat';



interface ChatFolderProps {
  folderChats: ChatHistoryInterface[];
  folderId: string;
}

const ChatFolder: React.FC<ChatFolderProps> = ({ folderChats, folderId }) => {
  // Add safety to store access
  const folder = useStore((state) => state.folders?.[folderId]);
  const expanded = useStore((state) => state.folders?.[folderId]?.expanded ?? true);
  
  // If folder doesn't exist in store yet, provide fallback rendering
  if (!folder) {
    return null; // or some loading state
  }

  const setChats = useStore((state) => state.setChats);
  const setFolders = useStore((state) => state.setFolders);

  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  const [_folderName, _setFolderName] = useState<string>(folder.name);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [isDelete, setIsDelete] = useState<boolean>(false);
  const [isHover, setIsHover] = useState<boolean>(false);
  const [showPalette, setShowPalette] = useState<boolean>(false);

  const editTitle = () => {
    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(useStore.getState().folders)
    );
    updatedFolders[folderId].name = _folderName;
    setFolders(updatedFolders);
    setIsEdit(false);
  };

  const deleteFolder = () => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    updatedChats.forEach((chat: ChatInterface) => {
      if (chat.folder === folderId) delete chat.folder;
    });
    setChats(updatedChats);

    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(useStore.getState().folders)
    );
    delete updatedFolders[folderId];
    setFolders(updatedFolders);

    setIsDelete(false);
  };

  const updateColor = (_color?: string) => {
    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(useStore.getState().folders)
    );
    if (_color) updatedFolders[folderId].color = _color;
    else delete updatedFolders[folderId].color;
    setFolders(updatedFolders);
    setShowPalette(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCross();
    }
  };

  const handleTick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (isEdit) editTitle();
    else if (isDelete) deleteFolder();
  };

  const handleCross = () => {
    setIsDelete(false);
    setIsEdit(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer) {
      e.stopPropagation();
      setIsHover(false);

      // expand folder on drop
      const updatedFolders: FolderCollection = JSON.parse(
        JSON.stringify(useStore.getState().folders)
      );
      updatedFolders[folderId].expanded = true;
      setFolders(updatedFolders);

      // update chat folderId to new folderId
      const chatIndex = Number(e.dataTransfer.getData('chatIndex'));
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats[chatIndex].folder = folderId;
      setChats(updatedChats);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHover(true);
  };

  const handleDragLeave = () => {
    setIsHover(false);
  };

  const toggleExpanded = () => {
    const updatedFolders: FolderCollection = JSON.parse(
      JSON.stringify(useStore.getState().folders)
    );
    updatedFolders[folderId].expanded = !updatedFolders[folderId].expanded;
    setFolders(updatedFolders);
  };

  useEffect(() => {
    if (inputRef && inputRef.current) inputRef.current.focus();
  }, [isEdit]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        paletteRef.current &&
        !paletteRef.current.contains(event.target as Node)
      ) {
        setShowPalette(false);
      }
    };

    if (showPalette) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [paletteRef, showPalette]);

  return (
    <Draggable draggableId={folderId} index={folder.order}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps}>
          <div
            className={`w-full transition-colors group/folder ${isHover ? 'bg-gray-800/40' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div
              style={{ background: folder.color || '' }}
              className={`${
                folder.color ? '' : 'hover:bg-gray-500/10'
              } transition-colors flex py-0 pl-2 pr-1 items-center gap-3 relative rounded-md break-all cursor-pointer parent-sibling text-gray-800 dark:text-gray-100`}
              onClick={toggleExpanded}
              ref={folderRef}
              onMouseEnter={() => {
                if (folder.color && folderRef.current)
                  folderRef.current.style.background = `${folder.color}dd`;
                if (gradientRef.current) gradientRef.current.style.width = '0px';
              }}
              onMouseLeave={() => {
                if (folder.color && folderRef.current)
                  folderRef.current.style.background = folder.color;
                if (gradientRef.current) gradientRef.current.style.width = '1rem';
              }}
            >
                <div {...provided.dragHandleProps}>
                  <FolderIcon className='h-4 w-4' />
                </div>
                <div className='flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative select-none'>
                {isEdit ? (
                  <input
                    type='text'
                    className='focus:outline-blue-600 text-sm border-none bg-transparent p-0 m-0 w-full select-text'
                    value={_folderName}
                    onChange={(e) => {
                      _setFolderName(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleKeyDown}
                    ref={inputRef}
                  />
                ) : (
                  _folderName
                )}
                {isEdit || (
                  <div
                    ref={gradientRef}
                    className='absolute inset-y-0 right-0 w-4 z-10 transition-all'
                    style={{
                      background:
                        folder.color &&
                        `linear-gradient(to left, ${
                          folder.color || 'var(--color-900)'
                        }, rgb(32 33 35 / 0))`,
                    }}
                  />
                )}
              </div>
              <div
                className='flex text-gray-300'
                onClick={(e) => e.stopPropagation()}
              >
                {isDelete || isEdit ? (
                  <>
                    <button className='p-1 hover:text-white' onClick={handleTick}>
                      <TickIcon />
                    </button>
                    <button className='p-1 hover:text-white' onClick={handleCross}>
                  {isDelete && <CancelIcon />}
                  {isEdit && <CrossIcon />}
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className='relative md:hidden group-hover/folder:md:inline'
                      ref={paletteRef}
                    >
                      <button
                        className='p-1 hover:bg-gray-500/10'
                        onClick={() => {
                          setShowPalette((prev) => !prev);
                        }}
                      >
                        <ColorPaletteIcon />
                      </button>
                      {showPalette && (
                        <div className='absolute left-0 bottom-0 translate-y-full p-2 z-20 bg-gray-900 rounded border border-gray-600 flex flex-col gap-2 items-center'>
                          <>
                            {folderColorOptions.map((c) => (
                              <button
                                key={c}
                                style={{ background: c }}
                                className={`hover:scale-90 transition-transform h-4 w-4 rounded-full`}
                                onClick={() => {
                                  updateColor(c);
                                }}
                              />
                            ))}
                            <button
                              onClick={() => {
                                updateColor();
                              }}
                            >
                              <RefreshIcon />
                            </button>
                          </>
                        </div>
                      )}
                    </div>
                    <button
                      className='p-1 hover:text-white md:hidden group-hover/folder:md:inline'
                      onClick={() => setIsEdit(true)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className='p-1 hover:bg-gray-500/10 md:hidden group-hover/folder:md:inline'
                      onClick={() => setIsDelete(true)}
                    >
                      <DeleteIcon />
                    </button>
                    <button className='p-1 hover:text-white' onClick={toggleExpanded}>
                      <DownChevronArrow
                        className={`${
                          expanded ? 'rotate-180' : ''
                        } transition-transform`}
                      />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className='ml-3 pl-1 border-l-2 border-gray-200 dark:border-gray-600 flex flex-col gap-1 parent'>
              {expanded && <NewChat folder={folderId} />}
              {expanded &&
                folderChats.map((chat: ChatHistoryInterface) => (
                  <ChatHistory
                    title={chat.title}
                    chatIndex={chat.index}
                    key={`${chat.title}-${chat.index}`}
                    />
                  ))}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default ChatFolder;
