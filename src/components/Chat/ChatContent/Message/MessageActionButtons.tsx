import React, { useState, MouseEvent, Dispatch, SetStateAction } from 'react';
import RefreshIcon from '@icons/RefreshIcon';
import DownChevronArrow from '@icons/DownChevronArrow';
import CrossIcon from '@icons/CrossIcon';
import TickIcon from '@icons/TickIcon';
import CopyIcon from '@icons/CopyIcon';
import EditIcon2 from '@icons/EditIcon2';
import DeleteIcon from '@icons/DeleteIcon';
import useStore from '@store/store';

interface MessageButtonProps {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  icon: React.ReactNode;
}

const MessageButton: React.FC<MessageButtonProps> = ({ onClick, icon }) => (
  <button
    className="p-1 rounded-md hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
    onClick={onClick}
  >
    {icon}
  </button>
);

interface ActionButtonProps {
  onClick: () => void;
}

const RefreshButton: React.FC<ActionButtonProps> = ({ onClick }) => (
  <MessageButton icon={<RefreshIcon />} onClick={onClick} />
);

const UpButton: React.FC<ActionButtonProps> = ({ onClick }) => (
  <MessageButton icon={<DownChevronArrow className="rotate-180" />} onClick={onClick} />
);

const DownButton: React.FC<ActionButtonProps> = ({ onClick }) => (
  <MessageButton icon={<DownChevronArrow />} onClick={onClick} />
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
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
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
  handleMoveUp,
  handleMoveDown,
  handleDelete,
  handleCopy
}) => {
  const lastMessageIndex = useStore(state => state.chats?.[state.currentChatIndex]?.messages.length - 1 ?? 0);
  const isGenerating = useStore(state => state.generating);

  return (
    <div className="flex justify-end gap-2 w-full mt-2">
      {isDelete ? (
        <>
          <MessageButton icon={<CrossIcon />} onClick={() => setIsDelete(false)} />
          <MessageButton icon={<TickIcon />} onClick={handleDelete} />
        </>
      ) : (
        <>
          {!isGenerating && role === 'assistant' && messageIndex === lastMessageIndex && <RefreshButton onClick={handleRefresh} />}
          {messageIndex > 0 && <UpButton onClick={handleMoveUp} />}
          {messageIndex < lastMessageIndex && <DownButton onClick={handleMoveDown} />}
          <CopyButton handleCopy={handleCopy} />
          <EditButton setIsActive={setIsEdit} />
          <DeleteButton setIsActive={setIsDelete} />
        </>
      )}
    </div>
  );
};

export default MessageActionButtons;
