import React from 'react';

import { Role } from '@type/chat';
import { useTranslation } from 'react-i18next';


export interface RoleSelectorProps {
  role: Role;
  messageIndex: number;
  isComposer?: boolean;
}

const RoleSelector = React.memo(({ role, messageIndex, isComposer }: RoleSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className='prose dark:prose-invert'>
    </div>
  );
});

export default RoleSelector;