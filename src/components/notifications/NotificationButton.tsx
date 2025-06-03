
import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { useTasks } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import NotificationsList from './NotificationsList';
import UpcomingTasksList from './UpcomingTasksList';

interface Notification {
  id: string;
  type: 'lead_assigned' | 'job_offer_assigned';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  lead_id?: string;
  lead_data?: any;
  creator_name?: string;
}

const NotificationButton = () => {
  const { reminders, unreadCount, markAsRead, markAllAsRead } = useReminders();
  const { tasks } = useTasks();
  const navigate = useNavigate();

  // Séparer les notifications des tâches
  const notifications: Notification[] = reminders
    .filter(r => r.type === 'lead_assigned' || r.type === 'job_offer_assigned')
    .map(r => ({
      id: r.id,
      type: r.type as 'lead_assigned' | 'job_offer_assigned',
      title: r.title,
      message: r.message,
      read: r.read,
      created_at: r.created_at,
      lead_id: r.lead_id,
      lead_data: r.lead_data,
      creator_name: r.creator_name
    }));
  
  const notificationCount = notifications.filter(n => !n.read).length;

  // Filtrer les tâches dues dans les 3 prochains jours ou en retard
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
  
  const upcomingTasks = tasks.filter(task => {
    if (task.isCompleted) return false;
    
    // Tâches en retard
    if (task.isOverdue) return true;
    
    // Tâches des 3 prochains jours
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      return dueDate <= threeDaysFromNow;
    }
    
    return false;
  });

  const taskCount = upcomingTasks.length;

  const handleDismissNotification = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    markAsRead(notificationId);
  };

  const handleViewAllTasks = () => {
    navigate('/tasks');
  };

  return (
    <div className="relative flex items-center">
      {/* Compteur notifications (bleu, à gauche) */}
      {notificationCount > 0 && (
        <Badge 
          variant="default"
          className="absolute -left-3 -top-1 h-5 w-5 p-0 text-xs flex items-center justify-center bg-blue-500 hover:bg-blue-500 z-10"
        >
          {notificationCount > 9 ? '9+' : notificationCount}
        </Badge>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between p-3 border-b">
            <DropdownMenuLabel className="p-0 font-semibold">Centre de notifications</DropdownMenuLabel>
            {notificationCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                Tout marquer lu
              </Button>
            )}
          </div>
          
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-3 mt-2">
              <TabsTrigger value="notifications" className="text-xs">
                Notifications
                {notificationCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 w-4 p-0 text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                Tasks
                {taskCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 w-4 p-0 text-xs">
                    {taskCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="notifications" className="mt-0">
              <NotificationsList 
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onDismiss={handleDismissNotification}
              />
            </TabsContent>
            
            <TabsContent value="tasks" className="mt-0">
              <UpcomingTasksList 
                tasks={upcomingTasks}
                onViewAllTasks={handleViewAllTasks}
              />
            </TabsContent>
          </Tabs>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Compteur tâches (rouge, à droite) */}
      {taskCount > 0 && (
        <Badge 
          variant="destructive"
          className="absolute -right-3 -top-1 h-5 w-5 p-0 text-xs flex items-center justify-center z-10"
        >
          {taskCount > 9 ? '9+' : taskCount}
        </Badge>
      )}
    </div>
  );
};

export default NotificationButton;
