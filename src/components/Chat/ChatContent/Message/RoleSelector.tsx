import React from 'react';

import { Role } from '@type/chat';

export interface RoleSelectorProps {
  role: Role;
  messageIndex: number;
  isComposer?: boolean;
}

const RoleSelector = React.memo(({  }: RoleSelectorProps) => {
  // Remove unused translation since we're not using it yet

  return (
    <div className='prose dark:prose-invert'>
    </div>
  );
});

export default RoleSelector;