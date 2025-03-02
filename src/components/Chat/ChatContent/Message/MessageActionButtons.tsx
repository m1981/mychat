import React, { useState, MouseEvent, Dispatch, SetStateAction } from 'react';

import CancelIcon from '@icon/CancelIcon';
import CopyIcon from '@icon/CopyIcon';
import DeleteIcon from '@icon/DeleteIcon';
import EditIcon2 from '@icon/EditIcon2';
import TickIcon from '@icon/TickIcon';
import useStore from '@store/store';

interface MessageButtonProps {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  icon: React.ReactNode;
}

const MessageButton: React.FC<MessageButtonProps> = ({ onClick, icon }) => (
  <button
    className="invisible group-hover:visible p-1 hover:text-white"
    onClick={onClick}
  >
    {icon}
  </button>
);

interface ActionButtonProps {
  onClick: () => void;
}

const RefreshButton: React.FC<ActionButtonProps> = ({ onClick }) => (
  <button
    className="invisible group-hover:visible px-3 py-1 text-sm 
    bg-gray-700 hover:bg-gray-800 text-gray-200 hover:text-white 
    rounded-md transition-colors duration-200"
    onClick={onClick}
  >
    Try again
  </button>
);

interface ToggleButtonProps {
  setIsActive: Dispatch<SetStateAction<boolean>>;
}

const EditButton: React.FC<ToggleButtonProps> = ({ setIsActive }) => (
  <MessageButton icon={<EditIcon2 />} onClick={() => setIsActive(true)} />
);

const DeleteButton: React.FC<ToggleButtonProps> = ({ setIsActive }) => (
  <MessageButton icon={<DeleteIcon />} onClick={() => setIsActive(true)} />
);

interface CopyButtonProps {
  handleCopy: () => void;
}

const CopyButton: React.FC<CopyButtonProps> = ({ handleCopy }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  // Remove unused event parameter
  const onClick = () => {
    handleCopy();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return <MessageButton icon={isCopied ? <TickIcon /> : <CopyIcon />} onClick={onClick} />;
};

interface MessageActionButtonsProps {
  isDelete: boolean;
  role: string;
  messageIndex: number;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  setIsDelete: Dispatch<SetStateAction<boolean>>;
  handleRefresh: () => void;
  handleMoveUp: () => void;
  handleMoveDown: () => void;
  handleDelete: () => void;
  handleCopy: () => void;
}

const MessageActionButtons: React.FC<MessageActionButtonsProps> = ({
  isDelete,
  role,
  messageIndex,
  setIsEdit,
  setIsDelete,
  handleRefresh,
  handleDelete,
  handleCopy
}) => {
  const lastMessageIndex = useStore(state => {
    const chats = state.chats;
    const currentChatIndex = state.currentChatIndex;
    // Remove redundant typeof check since currentChatIndex is already typed as number
    if (chats && chats[currentChatIndex]) {
      return chats[currentChatIndex].messages.length - 1;
    }
    return 0;
  });

  const isGenerating = useStore(state => state.generating);

  return (
    <div className="flex justify-end w-full mt-2 group">
      {isDelete ? (
        <>
          <MessageButton icon={<CancelIcon />} onClick={() => setIsDelete(false)} />
          <MessageButton icon={<TickIcon />} onClick={handleDelete} />
        </>
      ) : (
        <>
          {!isGenerating && role === 'assistant' && messageIndex === lastMessageIndex && (
            <RefreshButton onClick={handleRefresh} />
          )}
          <CopyButton handleCopy={handleCopy} />
          <EditButton setIsActive={setIsEdit} />
          <DeleteButton setIsActive={setIsDelete} />
        </>
      )}
    </div>
  );
};

export default MessageActionButtons;
