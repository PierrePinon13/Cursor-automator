
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Calendar, Clock, Briefcase } from 'lucide-react';
import { Reminder } from '@/hooks/useReminders';
import LeadDetailDialog from '@/components/leads/LeadDetailDialog';

interface RemindersListProps {
  reminders: Reminder[];
  onMarkAsRead: (reminderId: string) => void;
}

const RemindersList = ({ reminders, onMarkAsRead }: RemindersListProps) => {
  const navigate = useNavigate();
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogLeads, setDialogLeads] = useState<any[]>([]);

  // Ne plus afficher les assignations ici car elles sont dans NotificationsList
  const traditionalReminders = reminders.filter(r => 
    r.type !== 'lead_assigned' && r.type !== 'job_offer_assigned'
  );

  const handleReminderClick = (reminder: Reminder) => {
    if (!reminder.read) {
      onMarkAsRead(reminder.id);
    }
    
    // Si c'est un rappel traditionnel avec données complètes, ouvrir la dialog
    if (reminder.lead_data) {
      setDialogLeads([reminder.lead_data]);
      setSelectedLeadIndex(0);
      setIsDialogOpen(true);
    } else {
      // Sinon naviguer vers la page appropriée
      navigate(`/leads?leadId=${reminder.lead_id}`);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedLeadIndex(null);
    setDialogLeads([]);
  };

  const handleNavigateToLead = (index: number) => {
    setSelectedLeadIndex(index);
  };

  const handleActionCompleted = () => {
    handleCloseDialog();
  };

  const getReminderIcon = (reminder: Reminder) => {
    switch (reminder.type) {
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
      case 'reminder_due':
        return reminder.due_date && new Date(reminder.due_date) < new Date() ? 
          'Rappel en retard' : 'Rappel programmé';
      default:
        return 'Notification';
    }
  };

  if (traditionalReminders.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Aucun rappel
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="max-h-96">
        <div className="divide-y">
          {traditionalReminders.map((reminder) => (
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

      {/* Dialog pour afficher les détails du lead */}
      <LeadDetailDialog 
        leads={dialogLeads}
        selectedLeadIndex={selectedLeadIndex}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onNavigateToLead={handleNavigateToLead}
        onActionCompleted={handleActionCompleted}
      />
    </>
  );
};

export default RemindersList;
