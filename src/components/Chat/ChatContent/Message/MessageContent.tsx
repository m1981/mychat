import React, {
  DetailedHTMLProps,
  HTMLAttributes,
  useEffect,
  useState
} from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { CodeProps } from 'react-markdown/lib/ast-to-react';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import PopupModal from '@components/PopupModal';
import TokenCount from '@components/TokenCount';
import { useFileDropHandler } from '@hooks/useFileDropHandler';
import { usePasteHandler } from '@hooks/usePasteHandler';
import useSubmit from '@hooks/useSubmit';
import useStore from '@store/store';
import { ChatInterface, Role } from '@type/chat';

import CodeBlock from './CodeBlock';

import CommandPrompt from './CommandPrompt';


const MermaidDiagram = React.lazy(() => import('./MermaidComponent/index'));

export interface MessageContentProps {
  role: Role;
  content: string;
  messageIndex: number;
  isComposer: boolean;
  isEdit: boolean;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ContentViewProps {
  content: string;
}


interface EditViewProps {
  content: string;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  messageIndex: number;
  isComposer: boolean;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

const p = (props: DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>) => {
  return <p className="whitespace-pre-wrap">{props.children}</p>;
};

const MessageContent: React.FC<MessageContentProps> = ({
  content,
  messageIndex,
  isComposer = false,
  isEdit,
  setIsEdit,
  isEditing,
  setIsEditing,
}) => {
  // Add keyboard event handler at component level
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEdit && !isComposer) {
        e.preventDefault();
        setIsEdit(false);
      }
    };

    // Add the event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEdit, isComposer, setIsEdit]);

  return (
    <div 
      className='relative flex flex-col gap-1 md:gap-3 lg:w-[calc(100%)]'
      // Optional: Add tabIndex to make the div focusable
      tabIndex={isEdit ? 0 : -1}
    >
      {isEdit ? (
        <EditView
          content={content}
          setIsEdit={setIsEdit}
          messageIndex={messageIndex}
          isComposer={isComposer}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
        />
      ) : (
        <ContentView
          content={content}
        />
      )}
    </div>
  );
};

const ContentView = React.memo<ContentViewProps>(({
  content
}) => {
  return (
    <>
      <div className='markdown prose w-full md:max-w-full break-words dark:prose-invert dark share-gpt-message'>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
          rehypePlugins={[
            rehypeKatex,
            [rehypeHighlight, { detect: true, ignoreMissing: true }],
          ]}
          linkTarget='_new'
          components={{ code, p }}
        >
          {content.replace(/```svelte/g, '```')}
        </ReactMarkdown>
      </div>
    </>
  );
});

const code = React.memo<CodeProps>(({ inline, className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match && match[1];

  if (inline) {
    return <code className={className}>{children}</code>;
  }

  if (lang === 'mermaid') {
    return (
      <React.Suspense fallback={<div>Loading diagram...</div>}>
        <MermaidDiagram content={String(children).trim()} />
      </React.Suspense>
    );
  }

  return <CodeBlock lang={lang || 'text'} codeChildren={children} />;
});

const EditView: React.FC<EditViewProps> = ({
  content,
  setIsEdit,
  messageIndex,
  isComposer,
  isEditing,
  setIsEditing,
}) => {
  const inputRole = useStore((state) => state.inputRole);
  const setChats = useStore((state) => state.setChats);
  const currentChatIndex = useStore((state) => state.currentChatIndex);

  const [_content, _setContent] = useState<string>(content);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { t } = useTranslation();
  const { handleSubmit } = useSubmit();

  const { handlePaste } = usePasteHandler({
    onContentUpdate: _setContent
  });

  const { handleDragOver, handleDrop } = useFileDropHandler({
    onContentUpdate: _setContent,
    currentContent: _content
  });

  const resetTextAreaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|playbook|silk/i.test(
        navigator.userAgent
      );

    if (e.key === 'Escape' && !isComposer) {
      e.preventDefault();
      setIsEdit(false);
      return;
    }

    if (e.key === 'Enter' && !isMobile && !e.nativeEvent.isComposing) {
      const enterToSubmit = useStore.getState().enterToSubmit;
      if (isComposer) {
        if (
          (enterToSubmit && !e.shiftKey) ||
          (!enterToSubmit && (e.ctrlKey || e.shiftKey))
        ) {
          e.preventDefault();
          handleSaveAndSubmit();
          resetTextAreaHeight();
        }
      } else {
        if (e.ctrlKey && e.shiftKey) {
          e.preventDefault();
          handleSaveAndSubmit();
          resetTextAreaHeight();
        } else if (e.ctrlKey || e.shiftKey) handleSave();
      }
    }
  };

  const handleSave = () => {
    if (isComposer && (_content === '' || useStore.getState().generating)) return;
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;
    if (isComposer) {
      updatedMessages.push({ role: inputRole, content: _content });
      _setContent('');
      resetTextAreaHeight();
    } else {
      updatedMessages[messageIndex].content = _content;
      setIsEdit(false);
    }
    setChats(updatedChats);
    setIsEditing(false);
  };

  const handleSaveAndSubmit = async () => {
    if (useStore.getState().generating) return;

    // Get current state
    const currentState = useStore.getState();

    if (!_content.trim()) return;

    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(currentState.chats)
    );

    const updatedMessages = updatedChats[currentChatIndex].messages;
    if (isComposer) {
      if (_content !== '') {
        updatedMessages.push({ role: inputRole, content: _content.trim() });
      }

      // Update state and wait for it to complete
      await new Promise<void>(resolve => {
        setChats(updatedChats);
        // Use a small timeout to ensure state is updated
        setTimeout(resolve, 50); // Increased timeout for stability
      });

      // Clear content
      _setContent('');
      resetTextAreaHeight();
    } else {
      updatedMessages[messageIndex].content = _content;
      // Remove all messages after the edited message
      updatedChats[currentChatIndex].messages = updatedMessages.slice(0, messageIndex + 1);
      setIsEdit(false);
      
      // Update state and wait for it to complete
      await new Promise<void>(resolve => {
        setChats(updatedChats);
        setTimeout(resolve, 50); // Increased timeout for stability
      });
    }
    
    setIsEditing(false);

    // Now submit with updated state
    handleSubmit();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [_content]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    setIsEditing(true);
    return () => setIsEditing(false);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      // Focus the textarea
      textareaRef.current.focus();
      
      // Set cursor position to the end of the text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      
      // On mobile, ensure the element is in view when the keyboard appears
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        // Add a slight delay to account for keyboard appearance
        setTimeout(() => {
          textareaRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
          });
        }, 300);
      }
    }
  }, []); // Run only once when component mounts

  return (
    <>
      <div
        className={`w-full ${
          isComposer
            ? 'py-2 md:py-3 px-2 md:px-4 border border-black/10 bg-white dark:border-gray-900/50 dark:text-white dark:bg-gray-700 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]'
            : ''
        }`}
      >
        <textarea
          ref={textareaRef}
          className='m-0 resize-none rounded-lg bg-transparent overflow-y-hidden focus:ring-0 focus-visible:ring-0 leading-7 w-full placeholder:text-gray-500/40'
          onChange={(e) => {
            _setContent(e.target.value);
          }}
          onPaste={handlePaste}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          value={_content}
          placeholder={t('submitPlaceholder') as string}
          onKeyDown={handleKeyDown}
          rows={1}
        ></textarea>
      </div>
      <EditViewButtons
        isComposer={isComposer}
        handleSaveAndSubmit={handleSaveAndSubmit}
        handleSave={handleSave}
        setIsModalOpen={setIsModalOpen}
        setIsEdit={setIsEdit}
        _setContent={_setContent}
        isEditing={isEditing}
      />
      {isModalOpen && (
        <PopupModal
          setIsModalOpen={setIsModalOpen}
          title={t('warning') as string}
          message={t('clearMessageWarning') as string}
          handleConfirm={handleSaveAndSubmit}
        />
      )}
    </>
  );
};

const EditViewButtons = React.memo(
  ({
    isComposer = false,
    handleSaveAndSubmit,
    handleSave,
    setIsModalOpen,
    setIsEdit,
    _setContent,
    isEditing,
  }: {
    isComposer?: boolean;
    handleSaveAndSubmit: () => void;
    handleSave: () => void;
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
    _setContent: React.Dispatch<React.SetStateAction<string>>;
    isEditing: boolean;
  }) => {
    const { t } = useTranslation();
    const generating = useStore((state) => state.generating);

    const buttonContainerClass = isComposer
      ? 'flex-1 text-center mt-2 flex justify-center'
      : 'fixed border-t z-50 bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 flex justify-center space-x-2 shadow-lg';

    // For isComposer buttons, we should disable them when generating or when another message is being edited
    const disableComposer = generating || (isEditing && !isComposer);

    return (
      <div className={`flex ${isComposer ? '' : 'flex-col'}`}>
        <div className={buttonContainerClass}>
          {isComposer && (
            <button
              className={`btn relative mr-2 btn-primary ${
                disableComposer ? 'cursor-not-allowed opacity-40' : ''
              }`}
              onClick={handleSaveAndSubmit}
              disabled={disableComposer}
            >
              <div className='flex items-center justify-center gap-2'>
                {t('saveAndSubmit')}
              </div>
            </button>
          )}

          <button
            className={`btn relative mr-2 ${
              isComposer
                ? `btn-neutral ${
                    disableComposer ? 'cursor-not-allowed opacity-40' : ''
                  }`
                : 'btn-primary'
            }`}
            onClick={handleSave}
            disabled={isComposer && disableComposer}
          >
            <div className='flex items-center justify-center gap-2'>
              {t('save')}
            </div>
          </button>

          {!isComposer && (
            <>
              <button
                className='btn relative mr-2 btn-neutral'
                onClick={() => {
                  !generating && setIsModalOpen(true);
                }}
              >
                <div className='flex items-center justify-center gap-2'>
                  {t('saveAndSubmit')}
                </div>
              </button>

              <button
                className='btn relative btn-neutral'
                onClick={() => setIsEdit(false)}
              >
                <div className='flex items-center justify-center gap-2'>
                  {t('cancel')}
                </div>
              </button>
            </>
          )}
        </div>
        {isComposer && <TokenCount />}
        <CommandPrompt _setContent={_setContent} />
      </div>
    );
  }
);

export default MessageContent;
