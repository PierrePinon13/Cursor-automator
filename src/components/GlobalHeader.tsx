
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import UserActionsDropdown from './UserActionsDropdown';
import NotificationButton from './notifications/NotificationButton';

const GlobalHeader = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center justify-end gap-4 p-4 bg-white border-b border-gray-200">
      <NotificationButton />
      <UserActionsDropdown />
    </div>
  );
};

export default GlobalHeader;
