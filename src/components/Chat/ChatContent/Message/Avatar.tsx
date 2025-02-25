import React from 'react';
import { Role } from '@type/chat';
import SettingIcon from '@icon/SettingIcon';
import PersonIcon from '@icon/PersonIcon';
import AnthropicIcon from '@icon/AnthropicIcon';
import OpenAIIcon from '@icon/OpenAIIcon';
import useStore from '@store/store';

const Avatar = React.memo(({ role }: { role: Role }) => {
  return (
    <div className='flex-shrink-0 flex items-start mt-2'>
      {role === 'user' && <UserAvatar />}
      {role === 'assistant' && <AssistantAvatar />}
      {role === 'system' && <SystemAvatar />}
    </div>
  );
});

const UserAvatar = () => {
  return (
    <div
      className='relative h-[30px] w-[30px] p-1 rounded-full text-gray-800 dark:text-gray-100 flex items-center justify-center bg-gray-100 dark:bg-gray-800'
    >
      <PersonIcon />
    </div>
  );
};

const AssistantAvatar = () => {
  const provider = useStore(
    (state) =>
      state.chats &&
      state.chats.length > 0 &&
      state.currentChatIndex >= 0 &&
      state.currentChatIndex < state.chats.length
        ? state.chats[state.currentChatIndex].config.provider
        : 'anthropic'
  );

  return (
    <div
      className='relative h-[30px] w-[30px] p-1 rounded-full text-gray-800 dark:text-gray-100 flex items-center justify-center bg-gray-100 dark:bg-gray-800'
    >
      {provider === 'anthropic' ? <AnthropicIcon /> : <OpenAIIcon />}
    </div>
  );
};

const SystemAvatar = () => {
  return (
    <div
      className='relative h-[30px] w-[30px] p-1 rounded-full text-gray-800 dark:text-gray-100 flex items-center justify-center bg-gray-100 dark:bg-gray-800'
    >
      <SettingIcon />
    </div>
  );
};

export default Avatar;
