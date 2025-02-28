import React from 'react';
import { useTranslation } from 'react-i18next';

import { Role } from '@type/chat';

export interface RoleSelectorProps {
  role: Role;
  messageIndex: number;
  isComposer?: boolean;
}

const RoleSelector = React.memo(({ role, messageIndex, isComposer }: RoleSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className='prose dark:prose-invert'>
      <span className='text-sm text-gray-700 dark:text-gray-200'>
        {role === 'user' ? 'You' : t(role)}
      </span>
    </div>
  );
});

export default RoleSelector;