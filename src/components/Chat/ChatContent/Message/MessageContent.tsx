import React, {
  DetailedHTMLProps,
  HTMLAttributes,
  useEffect,
  useState,
  useRef
} from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { CodeProps, ReactMarkdownProps } from 'react-markdown/lib/ast-to-react';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import useStore from '@store/store';
import useSubmit from '@hooks/useSubmit';
import { ChatInterface } from '@type/chat';

import PopupModal from '@components/PopupModal';
import TokenCount from '@components/TokenCount';
import CommandPrompt from './CommandPrompt';
import CodeBlock from './CodeBlock';
import MessageActionButtons from './MessageActionButtons';
import { codeLanguageSubset } from '@constants/chat';
import mermaid from 'mermaid';
import * as LZString from 'lz-string';

const p = (props: DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>) => {
  return <p className="whitespace-pre-wrap">{props.children}</p>;
};

const MermaidDiagram = ({ content }: { content: string }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Function to generate mermaid.live link
  const getMermaidLiveLink = (code: string) => {
    try {
      // Normalize the code to use \n for line breaks
      const normalizedCode = code
        .replace(/\r\n/g, '\n')
        .replace(/\n\s+/g, '\n    '); // Ensure consistent indentation

      const state = {
        code: normalizedCode,
        mermaid: '{\n  "theme": "default"\n}',
        autoSync: true,
        rough: false,
        updateDiagram: false,
        panZoom: true,
        pan: {
          x: 168.09754057939372,
          y: 116.10714911357914
        },
        zoom: 0.6777827739715576
      };

      // Simple JSON.stringify without any replacements
      const jsonString = JSON.stringify(state);
      console.log('JSON state:', jsonString);

      // Compress using lz-string
      const compressed = LZString.compressToEncodedURIComponent(jsonString);
      console.log('Compressed state:', compressed);

      const link = `https://mermaid.live/edit#pako:${compressed}`;
      return link;
    } catch (error) {
      console.error('Error generating link:', error);
      return '#error';
    }
  };

// Function to download SVG
  const downloadSVG = () => {
    if (!svg) return;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to download PNG
  const downloadPNG = async () => {
    if (!svg) return;

    const svgElement = elementRef.current?.querySelector('svg');
    if (!svgElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svg);

    await new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        resolve(null);
      };
    });
  };

  useEffect(() => {
    const renderDiagram = async () => {
      if (!elementRef.current) return;

      try {
        // Reinitialize mermaid with current theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'forest',  // Using 'base' as it's the only customizable theme
          securityLevel: 'loose',
        });


        const { svg } = await mermaid.render(
          `mermaid-${Math.random().toString(36).substr(2, 9)}`,
          content
        );
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [content]);

    return (
    <div className="mermaid-container">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
    <div
      ref={elementRef}
      className="mermaid-diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />

        {/* Export options */}
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={() => window.open(getMermaidLiveLink(content), '_blank')}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit in Mermaid Live
          </button>
          <button
            onClick={downloadSVG}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download SVG
          </button>
          <button
            onClick={downloadPNG}
            className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Download PNG
          </button>
        </div>
      </div>

      <details className="mt-2">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          Show diagram source
        </summary>
        <pre className="mt-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
          <code>{content}</code>
        </pre>
      </details>

      {error && (
        <div className="text-red-500 p-4 border border-red-300 rounded mt-2">
          <p>Error rendering diagram: {error}</p>
          <pre className="mt-2 text-sm">{content}</pre>
        </div>
      )}
    </div>
  );
};


const MessageContent = ({
  role,
  content,
  messageIndex,
  sticky = false,
}: {
  role: string;
  content: string;
  messageIndex: number;
  sticky?: boolean;
}) => {
  const [isEdit, setIsEdit] = useState<boolean>(sticky);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  return (
    <div className='relative flex flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]'>
      <div className='flex flex-grow flex-col gap-3'></div>
      {isEdit ? (
        <EditView
          content={content}
          setIsEdit={setIsEdit}
          messageIndex={messageIndex}
          sticky={sticky}
          isEditing={isEditing}
          setIsEditing={setIsEditing}          
        />
      ) : (
        <ContentView
          role={role}
          content={content}
          setIsEdit={setIsEdit}
          messageIndex={messageIndex}
          setIsEditing={setIsEditing}
        />
      )}
    </div>
  );
};

const ContentView = React.memo(
  ({
    role,
    content,
    setIsEdit,
    messageIndex,
    setIsEditing,
  }: {
    role: string;
    content: string;
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
    messageIndex: number;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
    const { handleSubmit } = useSubmit();
    const [isDelete, setIsDelete] = useState<boolean>(false);
    const currentChatIndex = useStore((state) => state.currentChatIndex);
    const setChats = useStore((state) => state.setChats);
    const lastMessageIndex = useStore((state) =>
      state.chats ? state.chats[state.currentChatIndex].messages.length - 1 : 0
    );

    const handleDelete = () => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats[currentChatIndex].messages.splice(messageIndex, 1);
      setChats(updatedChats);
    };

    const handleEdit = () => {
      setIsEdit(true);
      setIsEditing(true);
    };
    
    const handleMove = (direction: 'up' | 'down') => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const updatedMessages = updatedChats[currentChatIndex].messages;
      const temp = updatedMessages[messageIndex];
      if (direction === 'up') {
        updatedMessages[messageIndex] = updatedMessages[messageIndex - 1];
        updatedMessages[messageIndex - 1] = temp;
      } else {
        updatedMessages[messageIndex] = updatedMessages[messageIndex + 1];
        updatedMessages[messageIndex + 1] = temp;
      }
      setChats(updatedChats);
    };

    const handleMoveUp = () => {
      handleMove('up');
    };

    const handleMoveDown = () => {
      handleMove('down');
    };

    const handleRefresh = () => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const updatedMessages = updatedChats[currentChatIndex].messages;
      updatedMessages.splice(updatedMessages.length - 1, 1);
      setChats(updatedChats);
      handleSubmit();
    };

    const handleCopy = () => {
      navigator.clipboard.writeText(content);
    };

    return (
      <>
        <MessageActionButtons
          isDelete={isDelete}
          role={role}
          messageIndex={messageIndex}
          setIsEdit={handleEdit}
          setIsDelete={setIsDelete}
          handleRefresh={handleRefresh}
          handleMoveUp={() => handleMove('up')}
          handleMoveDown={() => handleMove('down')}
          handleDelete={handleDelete}
          handleCopy={handleCopy}
        />
        <div className=''>
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,
              [remarkMath, { singleDollarTextMath: false }],
            ]}
            rehypePlugins={[
              rehypeKatex,
              [
                rehypeHighlight,
                {
                  detect: true,
                  ignoreMissing: true,
                  subset: codeLanguageSubset,
                },
              ],
            ]}
            linkTarget='_new'
            components={{
              code,
              p,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        <MessageActionButtons
          isDelete={isDelete}
          role={role}
          messageIndex={messageIndex}
          setIsEdit={setIsEdit}
          setIsDelete={setIsDelete}
          handleRefresh={handleRefresh}
          handleMoveUp={() => handleMove('up')}
          handleMoveDown={() => handleMove('down')}
          handleDelete={handleDelete}
          handleCopy={handleCopy}
        />
      </>
    );
  }
);

const code = React.memo((props: CodeProps) => {
  const { inline, className, children } = props;
  const match = /language-(\w+)/.exec(className || '');
  const lang = match && match[1];

  if (inline) {
    return <code className={className}>{children}</code>;
  }

  if (lang === 'mermaid') {
    const mermaidContent = String(children).trim();

    return (
      <div className="mermaid-container">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <MermaidDiagram content={mermaidContent} />
        </div>
        <details className="mt-2">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Show diagram source
          </summary>
          <pre className="mt-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <code>{mermaidContent}</code>
          </pre>
        </details>
      </div>
    );
  }

    return <CodeBlock lang={lang || 'text'} codeChildren={children} />;
});

const EditView = ({
  content,
  setIsEdit,
  messageIndex,
  sticky,
  isEditing,
  setIsEditing,  
}: {
  content: string;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  messageIndex: number;
  sticky?: boolean;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>; 
}) => {
  const inputRole = useStore((state) => state.inputRole);
  const setChats = useStore((state) => state.setChats);
  const currentChatIndex = useStore((state) => state.currentChatIndex);

  const [_content, _setContent] = useState<string>(content);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const textareaRef = React.createRef<HTMLTextAreaElement>();

  const { t } = useTranslation();

  const resetTextAreaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|playbook|silk/i.test(
        navigator.userAgent
      );

    if (e.key === 'Enter' && !isMobile && !e.nativeEvent.isComposing) {
      const enterToSubmit = useStore.getState().enterToSubmit;
      if (sticky) {
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
    if (sticky && (_content === '' || useStore.getState().generating)) return;
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;
    if (sticky) {
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

  const { handleSubmit } = useSubmit();
  const handleSaveAndSubmit = () => {
    if (useStore.getState().generating) return;
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;
    if (sticky) {
      if (_content !== '') {
        updatedMessages.push({ role: inputRole, content: _content });
      }
      _setContent('');
      resetTextAreaHeight();
    } else {
      updatedMessages[messageIndex].content = _content;
      updatedChats[currentChatIndex].messages = updatedMessages.slice(
        0,
        messageIndex + 1
      );
      setIsEdit(false);
    }
    setChats(updatedChats);
    setIsEditing(false);
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
  
  return (
    <>
      <div
        className={`w-full ${
          sticky
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
          value={_content}
          placeholder={t('submitPlaceholder') as string}
          onKeyDown={handleKeyDown}
          rows={1}
        ></textarea>
      </div>
      <EditViewButtons
        sticky={sticky}
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
    sticky = false,
    handleSaveAndSubmit,
    handleSave,
    setIsModalOpen,
    setIsEdit,
    _setContent,
    isEditing,
  }: {
    sticky?: boolean;
    handleSaveAndSubmit: () => void;
    handleSave: () => void;
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
    _setContent: React.Dispatch<React.SetStateAction<string>>;
    isEditing: boolean;
  }) => {
    const { t } = useTranslation();
    const generating = useStore((state) => state.generating);

    const buttonContainerClass = sticky
      ? 'flex-1 text-center mt-2 flex justify-center'
      : 'fixed border-t z-50 bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 flex justify-center space-x-2 shadow-lg';

    // For sticky buttons, we should disable them when generating or when another message is being edited
    const disableSticky = generating || (isEditing && !sticky);

    return (
      <div className={`flex ${sticky ? '' : 'flex-col'}`}>
        <div className={buttonContainerClass}>
          {sticky && (
            <button
              className={`btn relative mr-2 btn-primary ${
                disableSticky ? 'cursor-not-allowed opacity-40' : ''
              }`}
              onClick={handleSaveAndSubmit}
              disabled={disableSticky}
            >
              <div className='flex items-center justify-center gap-2'>
                {t('saveAndSubmit')}
              </div>
            </button>
          )}

          <button
            className={`btn relative mr-2 ${
              sticky
                ? `btn-neutral ${
                    disableSticky ? 'cursor-not-allowed opacity-40' : ''
                  }`
                : 'btn-primary'
            }`}
            onClick={handleSave}
            disabled={sticky && disableSticky}
          >
            <div className='flex items-center justify-center gap-2'>
              {t('save')}
            </div>
          </button>

          {!sticky && (
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
        {sticky && <TokenCount />}
        <CommandPrompt _setContent={_setContent} />
      </div>
    );
  }
);

export default MessageContent;
