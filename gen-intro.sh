#!/bin/bash

set -euo pipefail

> intro-for-gpt.txt


echo "
You are a seasoned TypeScript/JavaScript developer with a strong expertise in constructing
extensive React applications within the Next.js framework.
Your state management tool of choice is Zustand, which you prefer for its minimalistic approach
and its ease of integration into the React ecosystem. You are adept at using Zustand to handle
the complex stateful logic that chat applications require, such as message history,
user status, notifications, and real-time updates." >> intro-for-gpt.txt

echo "


I'm working on my Chat application that is connected with OpenAI and
allow user make converations with AI" >> intro-for-gpt.txt



echo '
Project structure
Project structure
Project structure
Project structure

```

├── src
│   └── components
│       ├── AboutMenu
│       │   ├── AboutMenu.tsx
│       │   └── index.ts
│       ├── ApiMenu
│       │   ├── ApiMenu.tsx
│       │   └── index.ts
│       ├── ApiPopup
│       │   ├── ApiPopup.tsx
│       │   └── index.ts
│       ├── Chat
│       │   ├── Chat.tsx
│       │   ├── ChatContent
│       │   │   ├── ChatContent.tsx
│       │   │   ├── ChatTitle.tsx
│       │   │   ├── CloneChat.tsx
│       │   │   ├── DownloadChat.tsx
│       │   │   ├── index.ts
│       │   │   ├── Message
│       │   │   │   ├── Avatar.tsx
│       │   │   │   ├── CodeBlock.tsx
│       │   │   │   ├── CommandPrompt
│       │   │   │   │   ├── CommandPrompt.tsx
│       │   │   │   │   └── index.ts
│       │   │   │   ├── index.ts
│       │   │   │   ├── Message.tsx
│       │   │   │   ├── MessageActionButtons.tsx
│       │   │   │   ├── MessageContent.tsx
│       │   │   │   ├── NewMessageButton.tsx
│       │   │   │   └── RoleSelector.tsx
│       │   │   └── ScrollToBottomButton.tsx
│       │   ├── ChatInput.tsx
│       │   └── index.ts
│       ├── ChatConfigMenu
│       │   ├── ChatConfigMenu.tsx
│       │   └── index.ts
│       ├── ConfigMenu
│       │   ├── ConfigMenu.tsx
│       │   └── index.ts
│       ├── ImportExportChat
│       │   ├── ImportExportChat.tsx
│       │   └── index.ts
│       ├── LanguageSelector
│       │   ├── LanguageSelector.tsx
│       │   └── index.ts
│       ├── Menu
│       │   ├── ChatFolder.tsx
│       │   ├── ChatHistory.tsx
│       │   ├── ChatHistoryList.tsx
│       │   ├── ChatSearch.tsx
│       │   ├── index.ts
│       │   ├── Menu.tsx
│       │   ├── MenuOptions
│       │   │   ├── Account.tsx
│       │   │   ├── Api.tsx
│       │   │   ├── ClearConversation.tsx
│       │   │   ├── CollapseOptions.tsx
│       │   │   ├── index.ts
│       │   │   ├── Logout.tsx
│       │   │   ├── Me.tsx
│       │   │   ├── MenuOptions.tsx
│       │   │   └── ThemeSwitcher.tsx
│       │   ├── NewChat.tsx
│       │   └── NewFolder.tsx
│       ├── MobileBar
│       │   ├── MobileBar.tsx
│       │   └── index.ts
│       ├── PopupModal
│       │   ├── PopupModal.tsx
│       │   └── index.ts
│       ├── PromptLibraryMenu
│       │   ├── ExportPrompt.tsx
│       │   ├── ImportPrompt.tsx
│       │   ├── PromptLibraryMenu.tsx
│       │   └── index.ts
│       ├── SearchBar
│       │   ├── SearchBar.tsx
│       │   └── index.ts
│       ├── SettingsMenu
│       │   ├── AutoTitleToggle.tsx
│       │   ├── EnterToSubmitToggle.tsx
│       │   ├── SettingsMenu.tsx
│       │   └── index.ts
│       ├── ShareGPT
│       │   ├── ShareGPT.tsx
│       │   └── index.ts
│       ├── StopGeneratingButton
│       │   └── StopGeneratingButton.tsx
│       ├── Toggle
│       │   ├── Toggle.tsx
│       │   └── index.ts
│       ├── TokenCount
│       │   ├── TokenCount.tsx
│       │   └── index.ts

```

' >> intro-for-gpt.txt


#echo "
#Project structure
#Project structure
#Project structure
#Project structure
#" >> intro-for-gpt.txt

#echo '```' >> intro-for-gpt.txt
#find . -type f -not -path '*/\.*' -not -iname '*.jpg' -not -iname '*.png' -not -iname '*.svg'  -not -iname '*.*ss'  >> intro-for-gpt.txt
#echo '```' >> intro-for-gpt.txt

echo >> intro-for-gpt.txt
echo >> intro-for-gpt.txt
echo >> intro-for-gpt.txt
echo >> intro-for-gpt.txt
echo >> intro-for-gpt.txt

echo "Function declarations  and usage of useEffect and useState locations" >> intro-for-gpt.txt
echo "Function declarations  and usage of useEffect and useState locations" >> intro-for-gpt.txt
echo "Function declarations  and usage of useEffect and useState locations" >> intro-for-gpt.txt
echo '```' >> intro-for-gpt.txt
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -HnE 'function|useEffect|useState' {} + | grep -vE '//.*function|//.*useEffect|//.*useState' >> intro-for-gpt.txt
echo '```' >> intro-for-gpt.txt
