
import React, { useEffect, useRef, useState } from 'react';
import { debug } from '@utils/debug';

import useInitialiseNewChat from '@hooks/useInitialiseNewChat';
import CancelIcon from '@icon/CancelIcon';
import CrossIcon from '@icon/CrossIcon';
import DeleteIcon from '@icon/DeleteIcon';
import DotIcon from '@icon/DotIcon';
import EditIcon from '@icon/EditIcon';
import TickIcon from '@icon/TickIcon';
import useStore from '@store/store';

const ChatHistoryClass = {
  base: 'flex py-2 px-2 items-center gap-3 relative rounded-md break-all group transition-opacity text-gray-800 dark:text-gray-100',
  normal: 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-850',
  active: 'pr-14 bg-gray-100 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800',
  gradient: {
    base: 'absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l',
    normal: 'from-gray-50 group-hover:from-gray-100 dark:from-gray-900 dark:group-hover:from-gray-850',
    active: 'from-gray-100 dark:from-gray-800'
  },
  dot: 'fixed-right-position text-emerald-500 text-lg leading-none z-20'
};

const inputClass = 'focus:outline-blue-600 text-sm border-none bg-transparent p-0 m-0 w-[calc(100%-8px)] text-gray-800 dark:text-gray-100';
const actionButtonClass = 'p-1 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100';

const ChatHistory = React.memo(
  ({ title, chatIndex }: { title: string; chatIndex: number }) => {
    const initialiseNewChat = useInitialiseNewChat();
    const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);
    const setChats = useStore((state) => state.setChats);
    const active = useStore((state) => state.currentChatIndex === chatIndex);
    const generating = useStore((state) => state.generating);

    const [isDelete, setIsDelete] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [_title, _setTitle] = useState<string>(title);
    const inputRef = useRef<HTMLInputElement>(null);

    const editTitle = () => {
      const updatedChats = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats[chatIndex].title = _title;
      setChats(updatedChats);
      setIsEdit(false);
    };

    const deleteChat = () => {
      const updatedChats = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats.splice(chatIndex, 1);
      if (updatedChats.length > 0) {
        setCurrentChatIndex(0);
        setChats(updatedChats);
      } else {
        initialiseNewChat();
      }
      setIsDelete(false);
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
      else if (isDelete) deleteChat();
    };

    const handleCross = () => {
      setIsDelete(false);
      setIsEdit(false);
    };

    const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData('chatIndex', String(chatIndex));
      }
    };

    useEffect(() => {
      if (inputRef && inputRef.current) inputRef.current.focus();
    }, [isEdit]);

    // Add debug logging for chat selection
    const handleChatClick = () => {
      if (!generating) {
        debug.log('ui', '[ChatHistory] Selecting chat:', {
          title,
          originalIndex: chatIndex,
          currentStoreState: {
            currentIndex: useStore.getState().currentChatIndex,
            totalChats: useStore.getState().chats?.length,
            chatTitle: useStore.getState().chats?.[chatIndex]?.title,
          }
        });
        
        setCurrentChatIndex(chatIndex);
      }
    };

    return (
      <a
        className={`${ChatHistoryClass.base} ${
          active ? ChatHistoryClass.active : ChatHistoryClass.normal
        } ${generating ? 'cursor-not-allowed opacity-40' : 'cursor-pointer opacity-100'}`}
        onClick={handleChatClick}
        draggable
        onDragStart={handleDragStart}
      >
        <div className="flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative">
          {isEdit ? (
            <input
              type="text"
              className={inputClass}
              value={_title}
              onChange={(e) => {
                _setTitle(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              ref={inputRef}
            />
          ) : (
            <>
              <span>{_title}</span>
              {!active && <span className={ChatHistoryClass.dot}><DotIcon /></span>}
            </>
          )}

          {!isEdit && (
            <div
              className={`${ChatHistoryClass.gradient.base} ${
                active ? ChatHistoryClass.gradient.active : ChatHistoryClass.gradient.normal
              }`}
            />
          )}
        </div>
        {active && (
          <div className="absolute flex right-1 z-10 text-gray-600 dark:text-gray-300 visible pl-[5px] bg-gray-100 dark:bg-gray-800">
            {isDelete || isEdit ? (
              <>
                <button className={actionButtonClass} onClick={handleTick}>
                  <TickIcon />
                </button>
                <button className={actionButtonClass} onClick={handleCross}>
                  {isDelete ? <CancelIcon /> : <CrossIcon />}
                </button>
              </>
            ) : (
              <>
                <button className={actionButtonClass} onClick={() => setIsEdit(true)}>
                  <EditIcon />
                </button>
                <button className={actionButtonClass} onClick={() => setIsDelete(true)}>
                  <DeleteIcon />
                </button>
              </>
            )}
          </div>
        )}
      </a>
    );
  }
);

export default ChatHistory;
