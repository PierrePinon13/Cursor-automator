
import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReminders } from '@/hooks/useReminders';
import { useTasks } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import RemindersList from './RemindersList';
import TasksPreview from './TasksPreview';

const NotificationButton = () => {
  const { reminders, unreadCount, markAsRead, markAllAsRead } = useReminders();
  const { tasks, pendingCount } = useTasks();
  const navigate = useNavigate();

  const handleViewAllTasks = () => {
    navigate('/tasks');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {(unreadCount > 0 || pendingCount > 0) && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {(unreadCount + pendingCount) > 9 ? '9+' : (unreadCount + pendingCount)}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <DropdownMenuLabel className="p-0 font-semibold">Centre de notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
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
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-4 w-4 p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">
              Tâches
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-4 w-4 p-0 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications" className="mt-0">
            <RemindersList 
              reminders={reminders} 
              onMarkAsRead={markAsRead}
            />
          </TabsContent>
          
          <TabsContent value="tasks" className="mt-0">
            <TasksPreview onViewAllTasks={handleViewAllTasks} />
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationButton;
