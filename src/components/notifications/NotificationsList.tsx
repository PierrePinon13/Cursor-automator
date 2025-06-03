
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, UserPlus, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LeadDetailDialog from '@/components/leads/LeadDetailDialog';

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

interface NotificationsListProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onDismiss: (notificationId: string, event: React.MouseEvent) => void;
}

const NotificationsList = ({ notifications, onMarkAsRead, onDismiss }: NotificationsListProps) => {
  const navigate = useNavigate();
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogLeads, setDialogLeads] = useState<any[]>([]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    // Naviguer vers les tâches avec le focus sur la tâche concernée
    if (notification.type === 'lead_assigned' && notification.lead_id) {
      navigate(`/tasks?taskId=${notification.lead_id}`);
    } else if (notification.type === 'job_offer_assigned' && notification.lead_id) {
      navigate(`/tasks?taskId=${notification.lead_id}`);
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'lead_assigned':
        return <UserPlus className="h-4 w-4 text-purple-600" />;
      case 'job_offer_assigned':
        return <Briefcase className="h-4 w-4 text-blue-600" />;
      default:
        return <UserPlus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (notification: Notification) => {
    switch (notification.type) {
      case 'lead_assigned':
        return 'Lead assigné';
      case 'job_offer_assigned':
        return 'Offre d\'emploi assignée';
      default:
        return 'Notification';
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
            className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors relative ${
              !notification.read ? 'bg-blue-50 border-l-2 border-blue-500' : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getNotificationIcon(notification)}
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    {getNotificationTypeLabel(notification)}
                  </span>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
                <p className={`text-sm font-medium ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.message}
                </p>
                {notification.lead_data?.author_name && (
                  <p className="text-xs text-blue-600 mt-1">
                    Lead: {notification.lead_data.author_name}
                    {notification.lead_data.company_position && ` - ${notification.lead_data.company_position}`}
                  </p>
                )}
                {notification.creator_name && notification.type === 'lead_assigned' && (
                  <p className="text-xs text-green-600 mt-1">
                    Assigné par: {notification.creator_name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(notification.created_at), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </p>
              </div>
              
              {/* Bouton de suppression */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-60 hover:opacity-100"
                onClick={(e) => onDismiss(notification.id, e)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default NotificationsList;
