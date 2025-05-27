
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: 'lead_assigned' | 'reminder_due';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  lead_id?: string;
  client_name?: string;
}

interface NotificationsListProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
}

const NotificationsList = ({ notifications, onMarkAsRead }: NotificationsListProps) => {
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate to the relevant page if needed
    if (notification.lead_id) {
      // TODO: Navigate to lead detail or clients page
      console.log('Navigate to lead:', notification.lead_id);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Aucune notification
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-96">
      <div className="divide-y">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
              !notification.read ? 'bg-blue-50 border-l-2 border-blue-500' : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.message}
                </p>
                {notification.client_name && (
                  <p className="text-xs text-blue-600 mt-1">
                    Client: {notification.client_name}
                  </p>
                )}
              </div>
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true, 
                locale: fr 
              })}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default NotificationsList;
