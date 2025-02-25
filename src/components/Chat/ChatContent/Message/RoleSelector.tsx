import React from 'react';
import { useTranslation } from 'react-i18next';
import { Role } from '@type/chat';

interface RoleSelectorProps {
  role: Role;
}

const RoleSelector = React.memo(
  ({
    role,
  }: RoleSelectorProps) => {
    const { t } = useTranslation();

    return (
      <div className='prose dark:prose-invert'>
        <span className='text-sm text-gray-700 dark:text-gray-200'>
          {role === 'user' ? 'You' : t(role)}
        </span>
      </div>
    );
  }
);
export default RoleSelector;
