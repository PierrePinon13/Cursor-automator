
import { useReminders } from './useReminders';

// Redirection vers useReminders pour maintenir la compatibilité
export const useNotifications = () => {
  const { 
    reminders: notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    refreshReminders: refreshNotifications 
  } = useReminders();

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  };
};
