
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Calendar, Clock } from 'lucide-react';
import { Reminder } from '@/hooks/useReminders';

interface RemindersListProps {
  reminders: Reminder[];
  onMarkAsRead: (reminderId: string) => void;
}

const RemindersList = ({ reminders, onMarkAsRead }: RemindersListProps) => {
  const navigate = useNavigate();

  const handleReminderClick = (reminder: Reminder) => {
    if (!reminder.read) {
      onMarkAsRead(reminder.id);
    }
    
    // Naviguer vers la page des leads avec le lead sélectionné
    navigate(`/leads?leadId=${reminder.lead_id}`);
  };

  const getReminderIcon = (reminder: Reminder) => {
    switch (reminder.type) {
      case 'lead_assigned':
        return <UserPlus className="h-4 w-4 text-purple-600" />;
      case 'reminder_due':
        return reminder.due_date && new Date(reminder.due_date) < new Date() ? 
          <Clock className="h-4 w-4 text-red-600" /> :
          <Calendar className="h-4 w-4 text-orange-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getReminderTypeLabel = (reminder: Reminder) => {
    switch (reminder.type) {
      case 'lead_assigned':
        return 'Lead assigné';
      case 'reminder_due':
        return reminder.due_date && new Date(reminder.due_date) < new Date() ? 
          'Rappel en retard' : 'Rappel programmé';
      default:
        return 'Notification';
    }
  };

  if (reminders.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Aucune notification
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-96">
      <div className="divide-y">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
              !reminder.read ? 'bg-blue-50 border-l-2 border-blue-500' : ''
            }`}
            onClick={() => handleReminderClick(reminder)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getReminderIcon(reminder)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        {getReminderTypeLabel(reminder)}
                      </span>
                      {!reminder.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <p className={`text-sm font-medium ${!reminder.read ? 'text-blue-900' : 'text-gray-900'}`}>
                      {reminder.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {reminder.message}
                    </p>
                    {reminder.lead_data?.author_name && (
                      <p className="text-xs text-blue-600 mt-1">
                        Lead: {reminder.lead_data.author_name}
                        {reminder.lead_data.company_position && ` - ${reminder.lead_data.company_position}`}
                      </p>
                    )}
                    {reminder.creator_name && reminder.type === 'lead_assigned' && (
                      <p className="text-xs text-green-600 mt-1">
                        Assigné par: {reminder.creator_name}
                      </p>
                    )}
                    {reminder.due_date && (
                      <p className="text-xs text-orange-600 mt-1">
                        Échéance: {formatDistanceToNow(new Date(reminder.due_date), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(reminder.created_at), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default RemindersList;
